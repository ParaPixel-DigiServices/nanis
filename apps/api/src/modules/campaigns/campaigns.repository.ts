/**
 * Repository for campaign database operations
 * 
 * Follows the same patterns as contacts repository:
 * - All queries scoped by organization_id
 * - Consistent error handling
 * - Proper type safety
 */

import type {
  CampaignInsertData,
  Campaign,
  CampaignListItem,
  CampaignContext,
  CampaignStatus,
} from "./campaigns.types";
import { supabase } from "../../../lib/supabase";

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
}

/**
 * List campaigns filter options
 */
export interface ListCampaignsFilters {
  status?: CampaignStatus;
}

/**
 * Creates a new campaign
 * 
 * @param data - Campaign data to insert (organization_id and created_by from context)
 * @param context - Campaign context with organization_id and user_id
 * @returns Created campaign
 */
export async function createCampaign(
  data: CampaignInsertData,
  context: CampaignContext
): Promise<Campaign> {
  // Ensure organization_id matches context (security enforcement)
  if (data.organization_id !== context.organization_id) {
    throw new Error("Campaign organization_id must match context organization_id");
  }

  const { data: campaign, error } = await supabase
    .from("campaigns")
    .insert(data)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create campaign: ${error.message}`);
  }

  return campaign;
}

/**
 * Lists campaigns with pagination and optional filters
 * 
 * @param organizationId - Organization ID to scope the query (required)
 * @param pagination - Pagination parameters (page, limit)
 * @param filters - Optional filters (status)
 * @returns Paginated list of campaigns
 */
export async function listCampaigns(
  organizationId: string,
  pagination?: PaginationParams,
  filters?: ListCampaignsFilters
): Promise<{
  campaigns: CampaignListItem[];
  total: number;
}> {
  const page = pagination?.page || 1;
  const limit = Math.min(pagination?.limit || 50, 100); // Max 100 per page
  const offset = (page - 1) * limit;

  // Build base query - always scoped by organization_id
  let campaignsQuery = supabase
    .from("campaigns")
    .select("*", { count: "exact" })
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  // Apply status filter if provided
  if (filters?.status) {
    campaignsQuery = campaignsQuery.eq("status", filters.status);
  }

  // Execute query
  const { data: campaigns, error, count } = await campaignsQuery;

  if (error) {
    throw new Error(`Failed to fetch campaigns: ${error.message}`);
  }

  // Map to CampaignListItem
  const campaignList: CampaignListItem[] = (campaigns || []).map(
    (campaign) => ({
      id: campaign.id,
      organization_id: campaign.organization_id,
      name: campaign.name,
      status: campaign.status,
      scheduled_at: campaign.scheduled_at || null,
      created_at: campaign.created_at,
      updated_at: campaign.updated_at,
      created_by: campaign.created_by,
    })
  );

  return {
    campaigns: campaignList,
    total: count || 0,
  };
}

/**
 * Gets a campaign by ID with optional recipient count
 * 
 * @param id - Campaign ID
 * @param organizationId - Organization ID to scope the query (required for security)
 * @param includeRecipientCount - Whether to include recipient count (default: true)
 * @returns Campaign with optional recipient_count if found, null otherwise
 */
export async function getCampaignById(
  id: string,
  organizationId: string,
  includeRecipientCount: boolean = true
): Promise<(Campaign & { recipient_count?: number }) | null> {
  const { data: campaign, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .eq("organization_id", organizationId) // Always scope by organization_id
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // Not found
      return null;
    }
    throw new Error(`Failed to fetch campaign: ${error.message}`);
  }

  if (!campaign) {
    return null;
  }

  // Fetch recipient count efficiently using aggregate query
  if (includeRecipientCount) {
    const { count, error: countError } = await supabase
      .from("campaign_recipients")
      .select("*", { count: "exact", head: true })
      .eq("campaign_id", id)
      .eq("organization_id", organizationId);

    if (countError) {
      // Log error but don't fail the entire request
      console.error(
        `Failed to fetch recipient count for campaign ${id}: ${countError.message}`
      );
      // Return campaign without recipient count
      return campaign;
    }

    return {
      ...campaign,
      recipient_count: count || 0,
    };
  }

  return campaign;
}

/**
 * Prepares campaign data for insertion
 * 
 * @param data - Campaign payload data
 * @param context - Campaign context with organization_id and user_id
 * @returns CampaignInsertData ready for database insertion
 */
export function prepareCampaignData(
  data: {
    name: string;
    status?: CampaignStatus;
    scheduled_at?: string | null;
  },
  context: CampaignContext
): CampaignInsertData {
  return {
    organization_id: context.organization_id,
    name: data.name,
    status: data.status || "draft",
    scheduled_at: data.scheduled_at || null,
    created_by: context.user_id,
  };
}

/**
 * Gets campaign target rules for a campaign
 * 
 * @param campaignId - Campaign ID
 * @param organizationId - Organization ID to scope the query (required for security)
 * @returns Campaign target rules if found, null otherwise
 */
export async function getCampaignTargetRules(
  campaignId: string,
  organizationId: string
): Promise<import("./campaigns.types").CampaignTargetRules | null> {
  const { data: rules, error } = await supabase
    .from("campaign_target_rules")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) {
    if (error.code === "PGRST116") {
      // Not found - return null (target rules are optional)
      return null;
    }
    throw new Error(`Failed to fetch campaign target rules: ${error.message}`);
  }

  return rules;
}

/**
 * Gets campaigns that are scheduled and ready to send
 * 
 * Criteria:
 * - status = "scheduled"
 * - scheduled_at <= now()
 * 
 * @param organizationId - Optional organization ID to scope the query (if not provided, checks all organizations)
 * @returns Array of campaigns ready to send
 */
export async function getScheduledCampaignsReadyToSend(
  organizationId?: string
): Promise<Campaign[]> {
  const now = new Date().toISOString();

  let query = supabase
    .from("campaigns")
    .select("*")
    .eq("status", "scheduled")
    .lte("scheduled_at", now)
    .not("scheduled_at", "is", null);

  // Optionally scope by organization
  if (organizationId) {
    query = query.eq("organization_id", organizationId);
  }

  const { data: campaigns, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch scheduled campaigns: ${error.message}`);
  }

  return (campaigns || []) as Campaign[];
}

/**
 * Updates campaign status
 * 
 * @param campaignId - Campaign ID
 * @param organizationId - Organization ID (for security)
 * @param status - New status
 * @returns Updated campaign or null if not found
 */
export async function updateCampaignStatus(
  campaignId: string,
  organizationId: string,
  status: CampaignStatus
): Promise<Campaign | null> {
  const { data: campaign, error } = await supabase
    .from("campaigns")
    .update({ status })
    .eq("id", campaignId)
    .eq("organization_id", organizationId)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // Not found
      return null;
    }
    throw new Error(`Failed to update campaign status: ${error.message}`);
  }

  return campaign;
}
