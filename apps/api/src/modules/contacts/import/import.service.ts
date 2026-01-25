/**
 * Service layer for contact import orchestration
 * Production-grade unified pipeline for all import sources
 */

import type {
  ImportRequest,
  ImportResult,
  NormalizedContact,
  ImportContext,
} from "./import.types";
import { normalizeRows } from "./import.normalizer";
import { deduplicateContacts } from "./import.deduplicator";
import {
  bulkInsertContacts,
  restoreContacts,
  bulkInsertCustomFieldValues,
  prepareContactData,
} from "./import.repository";

/**
 * Unified import pipeline for all sources:
 * - excel_copy_paste, csv_upload, xlsx_upload, mailchimp_import
 * 
 * Pipeline:
 * 1) Normalize raw rows
 * 2) Validate: At least one of email or mobile must exist
 * 3) Deduplicate by email per organization (with restore logic)
 * 4) Bulk insert unique contacts
 * 5) Restore soft-deleted contacts
 * 6) Bulk insert custom fields
 * 7) Return ImportResult summary
 */
export async function importContacts(
  request: ImportRequest,
  context: ImportContext
): Promise<ImportResult> {
  const result: ImportResult = {
    total: request.rows.length,
    created: 0,
    skipped: 0,
    restored: 0,
    invalid: 0,
    errors: [],
  };

  try {
    // Step 1: Convert rows to Record<string, string> format
    const stringRows: Array<Record<string, string>> = request.rows.map((row) => {
      const stringRow: Record<string, string> = {};
      for (const [key, value] of Object.entries(row)) {
        stringRow[key] = value !== null && value !== undefined ? String(value) : "";
      }
      return stringRow;
    });

    // Step 1: Normalize raw rows (auto-detects standard fields, handles full_name)
    const normalizedContacts = normalizeRows(stringRows, String(request.source));

    // Step 2: Validate: At least one of email or mobile must exist
    const validContactsWithIndex: Array<{
      contact: NormalizedContact;
      rowIndex: number;
    }> = [];
    const validationErrors: Array<{ rowIndex: number; reason: string }> = [];

    for (let i = 0; i < normalizedContacts.length; i++) {
      const contact = normalizedContacts[i];
      const hasEmail = contact.email !== undefined && contact.email !== "";
      const hasMobile = contact.mobile !== undefined && contact.mobile !== "";

      if (!hasEmail && !hasMobile) {
        validationErrors.push({
          rowIndex: i,
          reason: "Contact must have at least email or mobile",
        });
        result.invalid++;
        continue;
      }

      validContactsWithIndex.push({ contact, rowIndex: i });
    }

    // Add validation errors to result
    result.errors.push(...validationErrors);

    if (validContactsWithIndex.length === 0) {
      return result;
    }

    // Extract just the contacts for deduplication
    const validContacts = validContactsWithIndex.map((item) => item.contact);

    // Step 3: Deduplicate by email per organization (with restore logic)
    const { uniqueContacts, duplicateContacts, restoreContacts: contactsToRestore } =
      await deduplicateContacts(validContacts, context.organization_id);

    // Track skipped duplicates
    result.skipped = duplicateContacts.length;

    // Add duplicate errors to result with correct row indices
    const duplicateEmails = new Set(
      duplicateContacts
        .map((c) => c.email?.toLowerCase())
        .filter((email): email is string => email !== undefined)
    );

    for (const { contact, rowIndex } of validContactsWithIndex) {
      const email = contact.email?.toLowerCase();
      if (email && duplicateEmails.has(email)) {
        result.errors.push({
          rowIndex,
          reason: "Duplicate email already exists in organization",
        });
      }
    }

    // Step 4: Bulk insert unique contacts
    let contactIdMap = new Map<string, string>();

    if (uniqueContacts.length > 0) {
      const contactData = uniqueContacts.map((contact) =>
        prepareContactData(contact, {
          organizationId: context.organization_id,
          userId: context.user_id,
          source: String(request.source),
        })
      );

      contactIdMap = await bulkInsertContacts(
        contactData,
        context.organization_id
      );

      result.created = contactIdMap.size;
    }

    // Step 5: Restore soft-deleted contacts
    if (contactsToRestore.length > 0) {
      const restoreData = contactsToRestore.map(({ contact, existingContactId }) => ({
        contactId: existingContactId,
        contact,
        context: {
          organizationId: context.organization_id,
          userId: context.user_id,
          source: String(request.source),
        },
      }));

      const restoredMap = await restoreContacts(restoreData);

      // Merge restored contacts into contactIdMap
      for (const [email, contactId] of restoredMap.entries()) {
        contactIdMap.set(email, contactId);
      }

      result.restored = restoredMap.size;
    }

    // Step 6: Bulk insert custom fields
    // Combine unique and restored contacts for custom field insertion
    const allProcessedContacts = [
      ...uniqueContacts.filter((contact) => {
        const email = contact.email?.toLowerCase();
        return email && contactIdMap.has(email);
      }),
      ...contactsToRestore
        .map(({ contact }) => contact)
        .filter((contact) => {
          const email = contact.email?.toLowerCase();
          return email && contactIdMap.has(email);
        }),
    ];

    if (allProcessedContacts.length > 0) {
      // Check if any contacts have custom fields
      const hasCustomFields = allProcessedContacts.some(
        (contact) => Object.keys(contact.custom_fields).length > 0
      );

      if (hasCustomFields) {
        try {
          await bulkInsertCustomFieldValues(
            contactIdMap,
            allProcessedContacts,
            context.organization_id,
            context.user_id
          );
        } catch (error) {
          // Log custom field insertion errors but don't fail the entire import
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          console.error(`Failed to insert custom fields: ${errorMessage}`);
        }
      }
    }

    // Track any contacts that failed to insert (not in the map)
    const uniqueContactsWithIndex: Array<{
      contact: NormalizedContact;
      rowIndex: number;
    }> = [];

    for (const { contact, rowIndex } of validContactsWithIndex) {
      const email = contact.email?.toLowerCase();
      if (email && uniqueContacts.some((u) => u.email?.toLowerCase() === email)) {
        uniqueContactsWithIndex.push({ contact, rowIndex });
      }
    }

    const failedToInsert = uniqueContactsWithIndex.filter(({ contact }) => {
      const email = contact.email?.toLowerCase();
      return email && !contactIdMap.has(email);
    });

    if (failedToInsert.length > 0) {
      // Add errors for failed inserts with correct row indices
      for (const { rowIndex } of failedToInsert) {
        result.errors.push({
          rowIndex,
          reason: "Failed to insert contact (database error)",
        });
        result.invalid++;
      }
    }
  } catch (error) {
    // Add general error to result
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    result.errors.push({
      rowIndex: -1,
      reason: `Import failed: ${errorMessage}`,
    });
    // Recalculate invalid count
    result.invalid =
      result.total - result.created - result.skipped - result.restored;
  }

  return result;
}
