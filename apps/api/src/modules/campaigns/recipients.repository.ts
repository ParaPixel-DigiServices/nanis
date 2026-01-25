/**
 * Repository for campaign recipients database operations
 * 
 * Follows the same patterns as contacts repository:
 * - All queries scoped by organization_id
 * - Consistent error handling
 * - Proper type safety
 */

import type {
  CampaignRecipient,
  CampaignRecipientInsertData,
} from "./campaigns.types";
import { supabase } from "../../../lib/supabase";

const BATCH_SIZE = 500;

/**
 * Gets contact IDs that have bounced in any campaign
 * 
 * @param organizationId - Organization ID to scope the query
 * @returns Set of contact IDs that have bounced
 */
export async function getBouncedContactIds(
  organizationId: string
): Promise<Set<string>> {
  const { data: bouncedRecipients, error } = await supabase
    .from("campaign_recipients")
    .select("contact_id")
    .eq("organization_id", organizationId)
    .eq("status", "bounced");

  if (error) {
    throw new Error(`Failed to fetch bounced contacts: ${error.message}`);
  }

  return new Set((bouncedRecipients || []).map((r) => r.contact_id));
}

/**
 * Gets eligible contacts for a campaign
 * 
 * Criteria:
 * - organization_id matches
 * - is_active = true (if exclude_inactive = true, default behavior)
 * - is_subscribed = true (if exclude_unsubscribed = true, default behavior)
 * - country NOT in exclude_countries (if provided)
 * - NOT in bounced contacts list (if exclude_bounced = true)
 * 
 * @param organizationId - Organization ID to scope the query
 * @param excludeCountries - Optional array of country codes to exclude (lowercase ISO codes)
 * @param excludeBounced - Whether to exclude contacts that have bounced in any campaign
 * @param excludeUnsubscribed - Whether to exclude unsubscribed contacts (true = exclude, false/null = include all)
 * @param excludeInactive - Whether to exclude inactive contacts (true = exclude, false/null = include all)
 * @returns Array of contact IDs
 */
export async function getEligibleContacts(
  organizationId: string,
  excludeCountries?: string[] | null,
  excludeBounced?: boolean | null,
  excludeUnsubscribed?: boolean | null,
  excludeInactive?: boolean | null
): Promise<string[]> {
  let contactsQuery = supabase
    .from("contacts")
    .select("id")
    .eq("organization_id", organizationId);

  // Apply is_active filter
  // If exclude_inactive = true (or null/undefined), only include active contacts
  // If exclude_inactive = false, include all contacts regardless of is_active
  if (excludeInactive !== false) {
    contactsQuery = contactsQuery.eq("is_active", true);
  }

  // Apply is_subscribed filter
  // If exclude_unsubscribed = true (or null/undefined), only include subscribed contacts
  // If exclude_unsubscribed = false, include all contacts regardless of is_subscribed
  if (excludeUnsubscribed !== false) {
    contactsQuery = contactsQuery.eq("is_subscribed", true);
  }

  // Apply country exclusion if provided
  if (excludeCountries && excludeCountries.length > 0) {
    // Normalize country codes to lowercase for comparison
    const excludeCountriesLower = excludeCountries
      .map((c) => c.toLowerCase().trim())
      .filter((c) => c);
    
    if (excludeCountriesLower.length > 0) {
      // Supabase/PostgREST: Use .not() with "in" operator for exclusion
      const countryList = excludeCountriesLower.map((c) => `"${c}"`).join(",");
      contactsQuery = contactsQuery.not("country", "in", `(${countryList})`);
    }
  }

  const { data: contacts, error } = await contactsQuery;

  if (error) {
    throw new Error(`Failed to fetch eligible contacts: ${error.message}`);
  }

  let eligibleContactIds = (contacts || []).map((contact) => contact.id);

  // Apply bounced exclusion if requested
  if (excludeBounced === true) {
    const bouncedContactIds = await getBouncedContactIds(organizationId);
    eligibleContactIds = eligibleContactIds.filter(
      (contactId) => !bouncedContactIds.has(contactId)
    );
  }

  return eligibleContactIds;
}

/**
 * Gets existing recipient contact IDs for a campaign
 * 
 * @param campaignId - Campaign ID
 * @param organizationId - Organization ID (for security)
 * @returns Set of contact IDs that are already recipients
 */
export async function getExistingRecipients(
  campaignId: string,
  organizationId: string
): Promise<Set<string>> {
  const { data: recipients, error } = await supabase
    .from("campaign_recipients")
    .select("contact_id")
    .eq("campaign_id", campaignId)
    .eq("organization_id", organizationId);

  if (error) {
    throw new Error(`Failed to fetch existing recipients: ${error.message}`);
  }

  return new Set((recipients || []).map((r) => r.contact_id));
}

/**
 * Bulk inserts campaign recipients
 * 
 * Handles duplicate constraint violations gracefully (unique constraint on campaign_id, contact_id)
 * 
 * @param recipients - Array of recipient data to insert
 * @returns Number of successfully inserted recipients
 */
export async function bulkInsertRecipients(
  recipients: CampaignRecipientInsertData[]
): Promise<number> {
  if (recipients.length === 0) {
    return 0;
  }

  let insertedCount = 0;
  const errors: string[] = [];

  // Insert in batches
  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);

    try {
      const { data, error } = await supabase
        .from("campaign_recipients")
        .insert(batch)
        .select("id");

      if (error) {
        // Check if it's a unique constraint violation (duplicate campaign_id, contact_id)
        if (error.code === "23505") {
          // Handle individual conflicts - try inserting one by one
          for (const recipient of batch) {
            try {
              const { error: singleError } = await supabase
                .from("campaign_recipients")
                .insert(recipient)
                .select("id")
                .single();

              if (!singleError) {
                insertedCount++;
              }
              // If error, it's a duplicate - skip silently
            } catch {
              // Skip this recipient, continue with next
            }
          }
        } else {
          errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`);
        }
        continue;
      }

      // Count successfully inserted recipients
      if (data) {
        insertedCount += data.length;
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error";
      errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${errorMessage}`);
      // Continue with next batch
    }
  }

  // Log warnings if some batches failed but others succeeded
  if (errors.length > 0 && insertedCount > 0) {
    console.warn(
      `Partial failure during recipient insertion: ${errors.length} batch(es) failed, ${insertedCount} recipient(s) inserted successfully`
    );
  }

  return insertedCount;
}

/**
 * Gets total recipient count for a campaign
 * 
 * @param campaignId - Campaign ID
 * @param organizationId - Organization ID (for security)
 * @returns Total number of recipients
 */
export async function getRecipientCount(
  campaignId: string,
  organizationId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("campaign_recipients")
    .select("*", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .eq("organization_id", organizationId);

  if (error) {
    throw new Error(`Failed to count recipients: ${error.message}`);
  }

  return count || 0;
}

/**
 * Marks a campaign recipient as bounced
 * 
 * Updates:
 * - status = "bounced"
 * - bounced_at = current timestamp
 * 
 * @param campaignId - Campaign ID
 * @param contactId - Contact ID
 * @param organizationId - Organization ID (for security)
 * @returns Updated recipient or null if not found
 */
export async function markRecipientAsBounced(
  campaignId: string,
  contactId: string,
  organizationId: string
): Promise<CampaignRecipient | null> {
  const bouncedAt = new Date().toISOString();

  const { data: recipient, error } = await supabase
    .from("campaign_recipients")
    .update({
      status: "bounced",
      bounced_at: bouncedAt,
    })
    .eq("campaign_id", campaignId)
    .eq("contact_id", contactId)
    .eq("organization_id", organizationId)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // Not found
      return null;
    }
    throw new Error(`Failed to mark recipient as bounced: ${error.message}`);
  }

  return recipient;
}

/**
 * Marks multiple campaign recipients as bounced
 * 
 * @param recipients - Array of {campaign_id, contact_id} pairs
 * @param organizationId - Organization ID (for security)
 * @returns Number of successfully updated recipients
 */
export async function bulkMarkRecipientsAsBounced(
  recipients: Array<{ campaign_id: string; contact_id: string }>,
  organizationId: string
): Promise<number> {
  if (recipients.length === 0) {
    return 0;
  }

  const bouncedAt = new Date().toISOString();
  let updatedCount = 0;

  // Update in batches
  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);

    for (const { campaign_id, contact_id } of batch) {
      try {
        const { error } = await supabase
          .from("campaign_recipients")
          .update({
            status: "bounced",
            bounced_at: bouncedAt,
          })
          .eq("campaign_id", campaign_id)
          .eq("contact_id", contact_id)
          .eq("organization_id", organizationId);

        if (!error) {
          updatedCount++;
        }
      } catch {
        // Skip this recipient, continue with next
      }
    }
  }

  return updatedCount;
}
