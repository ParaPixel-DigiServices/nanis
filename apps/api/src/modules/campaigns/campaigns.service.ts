/**
 * Service layer for campaign operations
 * 
 * Responsibilities:
 * - Validate campaign payload
 * - Enforce organization context
 * - Call repository methods
 * - Return normalized responses
 * 
 * Follows the same structure and error patterns used in contacts services
 */

import type {
  CreateCampaignPayload,
  Campaign,
  ListCampaignsQuery,
  ListCampaignsResult,
  CampaignContext,
  CampaignStatus,
} from "./campaigns.types";
import {
  createCampaign,
  listCampaigns,
  getCampaignById,
  prepareCampaignData,
  type PaginationParams,
  type ListCampaignsFilters,
} from "./campaigns.repository";

/**
 * Valid campaign statuses
 */
const VALID_STATUSES: CampaignStatus[] = [
  "draft",
  "scheduled",
  "sending",
  "sent",
  "paused",
];

/**
 * Maximum campaign name length
 */
const MAX_NAME_LENGTH = 255;

/**
 * Minimum campaign name length
 */
const MIN_NAME_LENGTH = 1;

/**
 * Creates a new campaign
 * 
 * Validates:
 * - Campaign name is required and within length limits
 * - Status is valid if provided
 * 
 * Enforces:
 * - organization_id from context (not from payload)
 * - created_by from context
 * 
 * @param payload - Campaign payload from client (NO organization_id)
 * @param context - Campaign context with organization_id and user_id
 * @returns Created campaign
 * @throws Error if validation fails
 */
export async function createCampaignService(
  payload: CreateCampaignPayload,
  context: CampaignContext
): Promise<Campaign> {
  // Validate organization context
  if (!context.organization_id || !context.user_id) {
    throw new Error("Invalid campaign context: organization_id and user_id are required");
  }

  // Validate required fields
  if (!payload.name || typeof payload.name !== "string") {
    throw new Error("Campaign name is required");
  }

  const trimmedName = payload.name.trim();

  // Validate name length
  if (trimmedName.length < MIN_NAME_LENGTH) {
    throw new Error(`Campaign name must be at least ${MIN_NAME_LENGTH} character(s)`);
  }

  if (trimmedName.length > MAX_NAME_LENGTH) {
    throw new Error(`Campaign name must not exceed ${MAX_NAME_LENGTH} characters`);
  }

  // Validate status if provided
  if (payload.status && !VALID_STATUSES.includes(payload.status)) {
    throw new Error(
      `Invalid campaign status. Must be one of: ${VALID_STATUSES.join(", ")}`
    );
  }

  // Validate scheduled_at if provided
  let scheduledAt: string | null = payload.scheduled_at || null;
  
  if (scheduledAt) {
    // Validate scheduled_at is a valid ISO timestamp
    const scheduledDate = new Date(scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      throw new Error("Invalid scheduled_at format. Must be a valid ISO timestamp");
    }

    // Validate scheduled_at is in the future
    const now = new Date();
    if (scheduledDate <= now) {
      throw new Error("scheduled_at must be in the future");
    }

    // If scheduled_at is provided, status should be "scheduled" (unless explicitly set)
    if (!payload.status) {
      payload.status = "scheduled";
    } else if (payload.status !== "scheduled" && scheduledAt) {
      // If status is explicitly set to something other than "scheduled" but scheduled_at is provided,
      // we'll still set status to "scheduled" to ensure consistency
      payload.status = "scheduled";
    }
  } else {
    // If no scheduled_at and status is "scheduled", that's invalid
    if (payload.status === "scheduled") {
      throw new Error("scheduled_at is required when status is 'scheduled'");
    }
  }

  // Prepare campaign data (organization_id enforced from context)
  const campaignData = prepareCampaignData(
    {
      name: trimmedName,
      status: payload.status,
      scheduled_at: scheduledAt,
    },
    context
  );

  // Create campaign (organization_id enforced in repository)
  return await createCampaign(campaignData, context);
}

/**
 * Lists campaigns with pagination and optional filters
 * 
 * Validates:
 * - Pagination parameters (page >= 1, limit between 1 and 100)
 * - Status filter if provided
 * 
 * Enforces:
 * - organization_id from query (must match context)
 * 
 * @param query - List campaigns query with organization_id, pagination, and filters
 * @returns Paginated list of campaigns
 * @throws Error if validation fails
 */
export async function listCampaignsService(
  query: ListCampaignsQuery
): Promise<ListCampaignsResult> {
  // Validate organization_id
  if (!query.organization_id) {
    throw new Error("organization_id is required");
  }

  // Validate pagination
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(Math.max(1, query.limit || 50), 100); // Between 1 and 100

  // Validate status filter if provided
  if (query.status && !VALID_STATUSES.includes(query.status)) {
    throw new Error(
      `Invalid status filter. Must be one of: ${VALID_STATUSES.join(", ")}`
    );
  }

  // Prepare pagination params
  const pagination: PaginationParams = {
    page,
    limit,
  };

  // Prepare filters
  const filters: ListCampaignsFilters | undefined = query.status
    ? { status: query.status }
    : undefined;

  // Call repository (organization_id enforced in repository)
  const { campaigns, total } = await listCampaigns(
    query.organization_id,
    pagination,
    filters
  );

  // Calculate total pages
  const totalPages = Math.ceil(total / limit);

  // Return normalized response
  return {
    campaigns,
    pagination: {
      page,
      limit,
      total,
      total_pages: totalPages,
    },
  };
}

/**
 * Gets a campaign by ID with recipient count
 * 
 * Enforces:
 * - organization_id scope (campaign must belong to organization)
 * 
 * @param campaignId - Campaign ID
 * @param organizationId - Organization ID (required for security)
 * @param includeRecipientCount - Whether to include recipient count (default: true)
 * @returns Campaign with optional recipient_count if found, null otherwise
 * @throws Error if organizationId is missing or query fails
 */
export async function getCampaignByIdService(
  campaignId: string,
  organizationId: string,
  includeRecipientCount: boolean = true
): Promise<(Campaign & { recipient_count?: number }) | null> {
  // Validate parameters
  if (!campaignId) {
    throw new Error("Campaign ID is required");
  }

  if (!organizationId) {
    throw new Error("Organization ID is required");
  }

  // Get campaign with recipient count (organization_id enforced in repository)
  return await getCampaignById(campaignId, organizationId, includeRecipientCount);
}
