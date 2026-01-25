/**
 * Background campaign runner service
 * 
 * Responsibilities:
 * - Periodically check scheduled campaigns (status = "scheduled" and scheduled_at <= now())
 * - Generate recipients if not already generated
 * - Update campaign status to "sending"
 * 
 * Designed to be triggered by:
 * - Cron jobs (periodic execution)
 * - Supabase Edge Functions (scheduled functions)
 * - Manual API calls (for testing)
 * 
 * Follows the same structure and error patterns used in other services
 */

import type { Campaign } from "./campaigns.types";
import {
  getScheduledCampaignsReadyToSend,
  updateCampaignStatus,
  getCampaignById,
} from "./campaigns.repository";
import { generateCampaignRecipients } from "./recipients.service";
import { getRecipientCount } from "./recipients.repository";

/**
 * Result of running campaign automation
 */
export interface RunCampaignAutomationResult {
  processed_count: number;
  campaigns: Array<{
    campaign_id: string;
    organization_id: string;
    name: string;
    previous_status: string;
    new_status: string;
    recipients_generated: boolean;
    recipient_count: number;
  }>;
  errors: Array<{
    campaign_id: string;
    error: string;
  }>;
}

/**
 * System user ID for automated operations
 * This should be a system user that has permissions to run campaigns
 * In production, this should be configured via environment variable
 * 
 * Note: In a production system, you should:
 * 1. Create a system user in the profiles table
 * 2. Add that user to organization_members with appropriate permissions
 * 3. Set SYSTEM_USER_ID environment variable to that user's ID
 */
const SYSTEM_USER_ID = process.env.SYSTEM_USER_ID || "00000000-0000-0000-0000-000000000000";

/**
 * Runs campaign automation for scheduled campaigns
 * 
 * Logic:
 * 1. Find campaigns with status = "scheduled" and scheduled_at <= now()
 * 2. For each campaign:
 *    - Check if recipients exist
 *    - If no recipients, generate them
 *    - Update status to "sending"
 * 3. Return processing results
 * 
 * This function is idempotent and safe to run multiple times:
 * - If recipients already exist, skip generation
 * - If status is already "sending", skip update
 * - Handles errors gracefully without stopping other campaigns
 * 
 * Note: This function should be called periodically (e.g., every minute via cron)
 * 
 * @param organizationId - Optional organization ID to scope processing (if not provided, processes all organizations)
 * @returns RunCampaignAutomationResult with processed campaigns and errors
 */
export async function runCampaignAutomation(
  organizationId?: string
): Promise<RunCampaignAutomationResult> {
  const result: RunCampaignAutomationResult = {
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
        // Step 2.1: Check if recipients exist
        const recipientCount = await getRecipientCount(
          campaign.id,
          campaign.organization_id
        );

        let recipientsGenerated = false;

        // Step 2.2: Generate recipients if they don't exist
        if (recipientCount === 0) {
          try {
            // Create system context for recipient generation
            const systemContext = {
              organization_id: campaign.organization_id,
              user_id: SYSTEM_USER_ID,
            };

            // Generate recipients
            const recipientResult = await generateCampaignRecipients(
              campaign.id,
              systemContext
            );

            recipientsGenerated = recipientResult.added_count > 0;

            // If no recipients were generated (no eligible contacts), log warning but continue
            // Campaign will be updated to "sending" status with 0 recipients
            if (recipientResult.total_recipients === 0) {
              console.warn(
                `Campaign ${campaign.id} has no eligible contacts. Proceeding with 0 recipients.`
              );
            }
          } catch (recipientError) {
            const errorMessage =
              recipientError instanceof Error
                ? recipientError.message
                : "Unknown error";
            result.errors.push({
              campaign_id: campaign.id,
              error: `Failed to generate recipients: ${errorMessage}`,
            });
            continue;
          }
        }

        // Step 2.3: Update campaign status to "sending"
        // Only update if status is still "scheduled" (idempotency check)
        const currentCampaign = await getCampaignById(
          campaign.id,
          campaign.organization_id,
          false // Don't need recipient count here
        );

        if (!currentCampaign) {
          result.errors.push({
            campaign_id: campaign.id,
            error: "Campaign not found",
          });
          continue;
        }

        // Only update if still in "scheduled" status (idempotency)
        if (currentCampaign.status === "scheduled") {
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
              recipients_generated: recipientsGenerated,
              recipient_count: await getRecipientCount(
                campaign.id,
                campaign.organization_id
              ),
            });
          } else {
            result.errors.push({
              campaign_id: campaign.id,
              error: "Failed to update campaign status",
            });
          }
        } else {
          // Campaign status changed (possibly by another process), skip
          result.errors.push({
            campaign_id: campaign.id,
            error: `Campaign status is "${currentCampaign.status}", expected "scheduled"`,
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
    throw new Error(`Failed to run campaign automation: ${errorMessage}`);
  }
}
