/**
 * Service layer for campaign recipients operations
 * 
 * Responsibilities:
 * - Load campaign by id and organization_id
 * - Query eligible contacts (is_active = true, is_subscribed = true)
 * - Insert matching contacts into campaign_recipients table
 * - Avoid duplicates using unique constraint (campaign_id, contact_id)
 * - Return total recipient count
 * 
 * Follows the same structure and error patterns used in contacts services
 */

import type {
  CampaignContext,
  GenerateRecipientsResult,
} from "./campaigns.types";
import { getCampaignById, getCampaignTargetRules } from "./campaigns.repository";
import {
  getEligibleContacts,
  getExistingRecipients,
  bulkInsertRecipients,
  getRecipientCount,
  markRecipientAsBounced,
  bulkMarkRecipientsAsBounced,
} from "./recipients.repository";

/**
 * Generates campaign recipients from eligible contacts
 * 
 * Logic:
 * 1. Load campaign by id and organization_id
 * 2. Query contacts where:
 *    - organization_id matches
 *    - is_active = true
 *    - is_subscribed = true
 * 3. Filter out contacts that are already recipients
 * 4. Insert matching contacts into campaign_recipients table
 * 5. Avoid duplicates using unique constraint (campaign_id, contact_id)
 * 6. Return total recipient count
 * 
 * @param campaignId - Campaign ID
 * @param context - Campaign context with organization_id and user_id
 * @returns GenerateRecipientsResult with counts
 * @throws Error if campaign not found or operation fails
 */
export async function generateCampaignRecipients(
  campaignId: string,
  context: CampaignContext
): Promise<GenerateRecipientsResult> {
  // Step 1: Validate context
  if (!context.organization_id || !context.user_id) {
    throw new Error("Invalid campaign context: organization_id and user_id are required");
  }

  // Step 2: Validate campaign ID
  if (!campaignId) {
    throw new Error("Campaign ID is required");
  }

  // Step 3: Load campaign by id and organization_id
  const campaign = await getCampaignById(campaignId, context.organization_id);

  if (!campaign) {
    throw new Error("Campaign not found");
  }

  // Step 3.5: Load campaign target rules (if they exist)
  const targetRules = await getCampaignTargetRules(campaignId, context.organization_id);
  
  // Extract exclusion rules from target rules
  // Default behavior: exclude_unsubscribed = true, exclude_inactive = true (exclude by default)
  // If target rules specify false, then include those contacts
  const excludeCountries = targetRules?.exclude_countries || null;
  const excludeBounced = targetRules?.exclude_bounced || false;
  // exclude_unsubscribed: true/null = exclude unsubscribed, false = include all
  const excludeUnsubscribed = targetRules?.exclude_unsubscribed !== false;
  // exclude_inactive: true/null = exclude inactive, false = include all
  const excludeInactive = targetRules?.exclude_inactive !== false;

  // Step 4: Query eligible contacts
  // Criteria: organization_id matches
  // - is_active = true (unless exclude_inactive = false in target rules)
  // - is_subscribed = true (unless exclude_unsubscribed = false in target rules)
  // - Exclude contacts from countries in exclude_countries (if specified in target rules)
  // - Exclude contacts that have bounced in any campaign (if exclude_bounced = true)
  const eligibleContactIds = await getEligibleContacts(
    context.organization_id,
    excludeCountries,
    excludeBounced,
    excludeUnsubscribed,
    excludeInactive
  );

  if (eligibleContactIds.length === 0) {
    // No eligible contacts, return current count
    const totalRecipients = await getRecipientCount(campaignId, context.organization_id);
    return {
      total_recipients: totalRecipients,
      added_count: 0,
      skipped_count: 0,
    };
  }

  // Step 5: Get existing recipients to avoid duplicates
  const existingRecipients = await getExistingRecipients(campaignId, context.organization_id);

  // Step 6: Filter out contacts that are already recipients
  const newRecipientIds = eligibleContactIds.filter(
    (contactId) => !existingRecipients.has(contactId)
  );

  const skippedCount = eligibleContactIds.length - newRecipientIds.length;

  // Step 7: Insert new recipients (duplicates handled by unique constraint)
  let addedCount = 0;
  if (newRecipientIds.length > 0) {
    const recipientsToInsert = newRecipientIds.map((contactId) => ({
      campaign_id: campaignId,
      contact_id: contactId,
      organization_id: context.organization_id,
      status: "pending", // Default status
    }));

    addedCount = await bulkInsertRecipients(recipientsToInsert);
  }

  // Step 8: Get total recipient count
  const totalRecipients = await getRecipientCount(campaignId, context.organization_id);

  // Step 9: Return result
  return {
    total_recipients: totalRecipients,
    added_count: addedCount,
    skipped_count: skippedCount,
  };
}

/**
 * Marks a campaign recipient as bounced based on delivery status
 * 
 * This function should be called when a bounce event is received from the email service
 * (e.g., via webhook or delivery status update)
 * 
 * @param campaignId - Campaign ID
 * @param contactId - Contact ID
 * @param context - Campaign context with organization_id and user_id
 * @returns Updated recipient or null if not found
 * @throws Error if operation fails
 */
export async function markRecipientBounced(
  campaignId: string,
  contactId: string,
  context: CampaignContext
): Promise<import("./campaigns.types").CampaignRecipient | null> {
  // Validate context
  if (!context.organization_id || !context.user_id) {
    throw new Error("Invalid campaign context: organization_id and user_id are required");
  }

  // Validate campaign ID
  if (!campaignId) {
    throw new Error("Campaign ID is required");
  }

  // Validate contact ID
  if (!contactId) {
    throw new Error("Contact ID is required");
  }

  // Verify campaign belongs to organization
  const campaign = await getCampaignById(campaignId, context.organization_id);
  if (!campaign) {
    throw new Error("Campaign not found or does not belong to this organization");
  }

  // Mark recipient as bounced
  return await markRecipientAsBounced(campaignId, contactId, context.organization_id);
}

/**
 * Marks multiple campaign recipients as bounced
 * 
 * This function should be called when processing bulk bounce events
 * 
 * @param campaignId - Campaign ID
 * @param contactIds - Array of contact IDs that bounced
 * @param context - Campaign context with organization_id and user_id
 * @returns Number of successfully marked recipients
 * @throws Error if operation fails
 */
export async function bulkMarkRecipientsBounced(
  campaignId: string,
  contactIds: string[],
  context: CampaignContext
): Promise<number> {
  // Validate context
  if (!context.organization_id || !context.user_id) {
    throw new Error("Invalid campaign context: organization_id and user_id are required");
  }

  // Validate campaign ID
  if (!campaignId) {
    throw new Error("Campaign ID is required");
  }

  // Validate contact IDs
  if (!Array.isArray(contactIds) || contactIds.length === 0) {
    throw new Error("At least one contact ID is required");
  }

  // Verify campaign belongs to organization
  const campaign = await getCampaignById(campaignId, context.organization_id);
  if (!campaign) {
    throw new Error("Campaign not found or does not belong to this organization");
  }

  // Prepare recipients data
  const recipients = contactIds.map((contactId) => ({
    campaign_id: campaignId,
    contact_id: contactId,
  }));

  // Mark recipients as bounced
  return await bulkMarkRecipientsAsBounced(recipients, context.organization_id);
}
