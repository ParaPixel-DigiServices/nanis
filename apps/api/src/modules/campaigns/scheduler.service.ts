/**
 * Scheduler service for campaign automation
 * 
 * Responsibilities:
 * - Detect campaigns with status = "scheduled" and scheduled_at <= now()
 * - Update campaign status to "sending" when ready
 * - Can be called periodically (e.g., via cron job or scheduled function)
 * 
 * Follows the same structure and error patterns used in other services
 */

import type { Campaign, CampaignStatus } from "./campaigns.types";
import {
  getScheduledCampaignsReadyToSend,
  updateCampaignStatus,
} from "./campaigns.repository";

/**
 * Result of processing scheduled campaigns
 */
export interface ProcessScheduledCampaignsResult {
  processed_count: number;
  campaigns: Array<{
    campaign_id: string;
    organization_id: string;
    name: string;
    previous_status: CampaignStatus;
    new_status: CampaignStatus;
  }>;
  errors: Array<{
    campaign_id: string;
    error: string;
  }>;
}

/**
 * Processes scheduled campaigns that are ready to send
 * 
 * Logic:
 * 1. Find campaigns with status = "scheduled" and scheduled_at <= now()
 * 2. Update their status to "sending"
 * 3. Return list of processed campaigns
 * 
 * Note: This function should be called periodically (e.g., every minute via cron)
 * 
 * @param organizationId - Optional organization ID to scope processing (if not provided, processes all organizations)
 * @returns ProcessScheduledCampaignsResult with processed campaigns and errors
 */
export async function processScheduledCampaigns(
  organizationId?: string
): Promise<ProcessScheduledCampaignsResult> {
  const result: ProcessScheduledCampaignsResult = {
    processed_count: 0,
    campaigns: [],
    errors: [],
  };

  try {
    // Step 1: Get campaigns ready to send
    const scheduledCampaigns = await getScheduledCampaignsReadyToSend(organizationId);

    if (scheduledCampaigns.length === 0) {
      return result;
    }

    // Step 2: Process each campaign
    for (const campaign of scheduledCampaigns) {
      try {
        // Update status to "sending"
        const updatedCampaign = await updateCampaignStatus(
          campaign.id,
          campaign.organization_id,
          "sending"
        );

        if (updatedCampaign) {
          result.processed_count++;
          result.campaigns.push({
            campaign_id: campaign.id,
            organization_id: campaign.organization_id,
            name: campaign.name,
            previous_status: campaign.status,
            new_status: "sending",
          });
        } else {
          result.errors.push({
            campaign_id: campaign.id,
            error: "Campaign not found or update failed",
          });
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        result.errors.push({
          campaign_id: campaign.id,
          error: errorMessage,
        });
      }
    }

    return result;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to process scheduled campaigns: ${errorMessage}`);
  }
}
