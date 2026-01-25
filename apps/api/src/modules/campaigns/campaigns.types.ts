/**
 * Type definitions for Campaigns module
 */

/**
 * Campaign status enum
 */
export type CampaignStatus = "draft" | "scheduled" | "sending" | "sent" | "paused";

/**
 * Campaign entity (aligned with campaigns table)
 */
export interface Campaign {
  id: string;
  organization_id: string;
  name: string;
  status: CampaignStatus;
  scheduled_at: string | null; // ISO timestamp for scheduled send
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

/**
 * Campaign payload from client (NO organization_id - enforced from context)
 */
export interface CreateCampaignPayload {
  name: string;
  status?: CampaignStatus;
  scheduled_at?: string | null; // ISO timestamp for scheduled send (null = immediate send)
}

/**
 * Campaign response DTO
 */
export interface CampaignResponse {
  id: string;
  organization_id: string;
  name: string;
  status: CampaignStatus;
  scheduled_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  recipient_count?: number; // Optional recipient count (included when fetching campaign details)
}

/**
 * Campaign list item
 */
export interface CampaignListItem {
  id: string;
  organization_id: string;
  name: string;
  status: CampaignStatus;
  scheduled_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

/**
 * List campaigns result
 */
export interface ListCampaignsResult {
  campaigns: CampaignListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

/**
 * Query for listing campaigns (organization_id enforced from context)
 */
export interface ListCampaignsQuery {
  organization_id: string;
  page?: number;
  limit?: number;
  status?: CampaignStatus;
}

/**
 * Campaign insert data (internal use only - organization_id from context)
 */
export interface CampaignInsertData {
  organization_id: string;
  name: string;
  status: CampaignStatus;
  scheduled_at: string | null;
  created_by: string;
}

/**
 * Context for campaign operations (organization_id enforced here)
 */
export interface CampaignContext {
  organization_id: string;
  user_id: string;
}

/**
 * Campaign recipient status enum
 */
export type CampaignRecipientStatus = "pending" | "sent" | "delivered" | "bounced" | "opened" | "clicked";

/**
 * Campaign recipient entity
 */
export interface CampaignRecipient {
  id: string;
  campaign_id: string;
  contact_id: string;
  organization_id: string;
  status: CampaignRecipientStatus;
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  bounced_at: string | null;
  created_at: string;
}

/**
 * Campaign recipient insert data
 */
export interface CampaignRecipientInsertData {
  campaign_id: string;
  contact_id: string;
  organization_id: string;
  status?: CampaignRecipientStatus;
}

/**
 * Generate recipients result
 */
export interface GenerateRecipientsResult {
  total_recipients: number;
  added_count: number;
  skipped_count: number;
}

/**
 * Campaign target rules entity (aligned with campaign_target_rules table)
 */
export interface CampaignTargetRules {
  id: string;
  campaign_id: string;
  organization_id: string;
  include_emails: string[] | null;
  include_tags: string[] | null;
  exclude_tags: string[] | null;
  exclude_countries: string[] | null; // ISO country codes (lowercase)
  exclude_unsubscribed: boolean | null;
  exclude_inactive: boolean | null;
  exclude_bounced: boolean | null; // Exclude contacts that have bounced in any campaign
  created_at: string;
}
