/**
 * Handles contact deduplication by email within an organization
 * Production-grade with restore logic for soft-deleted contacts
 */

import type { NormalizedContact, ExistingContact } from "./import.types";
import { supabase } from "../../../lib/supabase";

export interface DeduplicationResult {
  uniqueContacts: NormalizedContact[];
  duplicateContacts: NormalizedContact[]; // Active contacts (skip)
  restoreContacts: Array<{
    contact: NormalizedContact;
    existingContactId: string;
  }>; // Soft-deleted contacts (restore)
}

/**
 * Deduplicates contacts by email (case-insensitive) within organization
 * Rules:
 * - Primary key = (organization_id + email)
 * - If email exists:
 *   - If active contact exists → skip (duplicate)
 *   - If soft-deleted contact exists → restore and update
 * - If no email but mobile exists → allow duplicates
 * 
 * @param normalizedContacts - Contacts to check for duplicates
 * @param organizationId - Organization ID to scope the check
 * @returns Object with uniqueContacts, duplicateContacts, and restoreContacts
 */
export async function deduplicateContacts(
  normalizedContacts: NormalizedContact[],
  organizationId: string
): Promise<DeduplicationResult> {
  const uniqueContacts: NormalizedContact[] = [];
  const duplicateContacts: NormalizedContact[] = [];
  const restoreContacts: Array<{
    contact: NormalizedContact;
    existingContactId: string;
  }> = [];

  // Extract unique emails (non-undefined, normalized)
  const emails = normalizedContacts
    .map((c) => c.email)
    .filter((email): email is string => email !== undefined && email !== "");

  // If no emails to check, all contacts are unique (contacts without email are treated as unique)
  if (emails.length === 0) {
    return {
      uniqueContacts: normalizedContacts,
      duplicateContacts: [],
      restoreContacts: [],
    };
  }

  // Query all existing contacts by email (both active and soft-deleted)
  const { data: existingContacts, error } = await supabase
    .from("contacts")
    .select("id, email, is_active, deleted_at")
    .eq("organization_id", organizationId) // Same organization only
    .in("email", emails);

  if (error) {
    throw new Error(`Failed to check duplicates: ${error.message}`);
  }

  // Create lookup maps: lowercase email -> contact info
  const activeContactsMap = new Map<string, ExistingContact>();
  const softDeletedContactsMap = new Map<string, ExistingContact>();

  for (const contact of existingContacts || []) {
    if (!contact.email) continue;

    const normalizedEmail = contact.email.toLowerCase();
    const contactInfo: ExistingContact = {
      id: contact.id,
      email: contact.email,
      is_active: contact.is_active,
      deleted_at: contact.deleted_at,
    };

    if (contact.is_active && !contact.deleted_at) {
      // Active contact
      activeContactsMap.set(normalizedEmail, contactInfo);
    } else {
      // Soft-deleted contact
      softDeletedContactsMap.set(normalizedEmail, contactInfo);
    }
  }

  // Separate contacts into unique, duplicate, and restore
  for (const contact of normalizedContacts) {
    // Contacts without email are always unique (allow duplicates for mobile-only)
    if (!contact.email) {
      uniqueContacts.push(contact);
      continue;
    }

    const normalizedEmail = contact.email.toLowerCase();

    if (activeContactsMap.has(normalizedEmail)) {
      // Active contact exists → skip (duplicate)
      duplicateContacts.push(contact);
    } else if (softDeletedContactsMap.has(normalizedEmail)) {
      // Soft-deleted contact exists → restore
      const existingContact = softDeletedContactsMap.get(normalizedEmail)!;
      restoreContacts.push({
        contact,
        existingContactId: existingContact.id,
      });
    } else {
      // Email doesn't exist → unique
      uniqueContacts.push(contact);
    }
  }

  return {
    uniqueContacts,
    duplicateContacts,
    restoreContacts,
  };
}
