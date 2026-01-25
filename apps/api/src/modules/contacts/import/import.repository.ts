/**
 * Repository for contact import database operations
 * Production-grade with conflict handling, restore, and custom fields
 */

import type {
  ContactInsertData,
  CustomFieldValue,
  NormalizedContact,
} from "./import.types";
import { supabase } from "../../../lib/supabase";

const BATCH_SIZE = 500;

/**
 * Bulk inserts contacts with conflict handling
 * Returns Map of email -> contact ID for successfully inserted contacts
 * Handles partial failures gracefully
 */
export async function bulkInsertContacts(
  contacts: ContactInsertData[],
  organizationId: string
): Promise<Map<string, string>> {
  const emailToIdMap = new Map<string, string>();

  if (contacts.length === 0) {
    return emailToIdMap;
  }

  // Insert in batches
  const errors: string[] = [];

  for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
    const batch = contacts.slice(i, i + BATCH_SIZE);

    try {
      const { data, error } = await supabase
        .from("contacts")
        .insert(batch)
        .select("id, email");

      if (error) {
        // Check if it's a unique constraint violation (duplicate email)
        if (error.code === "23505") {
          // Handle individual conflicts - try inserting one by one
          for (const contact of batch) {
            try {
              const { data: singleData, error: singleError } = await supabase
                .from("contacts")
                .insert(contact)
                .select("id, email")
                .single();

              if (!singleError && singleData?.email) {
                emailToIdMap.set(singleData.email.toLowerCase(), singleData.id);
              }
            } catch {
              // Skip this contact, continue with next
            }
          }
        } else {
          errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`);
        }
        continue;
      }

      // Map email -> contact ID for successfully inserted contacts
      if (data) {
        for (const contact of data) {
          if (contact.email) {
            emailToIdMap.set(contact.email.toLowerCase(), contact.id);
          }
        }
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error";
      errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${errorMessage}`);
      // Continue with next batch
    }
  }

  // If all batches failed, throw an error
  if (emailToIdMap.size === 0 && errors.length > 0) {
    throw new Error(
      `Failed to insert contacts: ${errors.join("; ")}`
    );
  }

  // Log warnings if some batches failed but others succeeded
  if (errors.length > 0 && emailToIdMap.size > 0) {
    console.warn(
      `Partial failure during contact insertion: ${errors.length} batch(es) failed, ${emailToIdMap.size} contact(s) inserted successfully`
    );
  }

  return emailToIdMap;
}

/**
 * Restores and updates soft-deleted contacts
 * Returns Map of email -> contact ID for successfully restored contacts
 */
export async function restoreContacts(
  restoreData: Array<{
    contactId: string;
    contact: NormalizedContact;
    context: {
      organizationId: string;
      userId: string;
      source: string;
    };
  }>
): Promise<Map<string, string>> {
  const emailToIdMap = new Map<string, string>();

  if (restoreData.length === 0) {
    return emailToIdMap;
  }

  // Restore in batches
  for (let i = 0; i < restoreData.length; i += BATCH_SIZE) {
    const batch = restoreData.slice(i, i + BATCH_SIZE);

    for (const { contactId, contact, context } of batch) {
      try {
        const updateData = {
          email: contact.email ?? null,
          first_name: contact.first_name ?? null,
          last_name: contact.last_name ?? null,
          mobile: contact.mobile ?? null,
          country: contact.country ?? null,
          source: context.source,
          is_active: true,
          deleted_at: null,
          updated_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
          .from("contacts")
          .update(updateData)
          .eq("id", contactId)
          .eq("organization_id", context.organizationId)
          .select("id, email")
          .single();

        if (!error && data?.email) {
          emailToIdMap.set(data.email.toLowerCase(), data.id);
        }
      } catch {
        // Skip this contact, continue with next
      }
    }
  }

  return emailToIdMap;
}

/**
 * Gets or creates custom field definitions
 * Returns map of field_name -> field_definition_id
 */
export async function getOrCreateCustomFieldDefinitions(
  customFieldNames: string[],
  organizationId: string,
  userId: string
): Promise<Map<string, string>> {
  if (customFieldNames.length === 0) {
    return new Map();
  }

  const fieldMap = new Map<string, string>();

  // Check existing field definitions
  const { data: existingFields, error: fetchError } = await supabase
    .from("contact_custom_field_definitions")
    .select("id, field_name")
    .eq("organization_id", organizationId)
    .in("field_name", customFieldNames);

  if (fetchError) {
    throw new Error(
      `Failed to fetch custom field definitions: ${fetchError.message}`
    );
  }

  // Map existing fields
  for (const field of existingFields || []) {
    fieldMap.set(field.field_name, field.id);
  }

  // Create missing field definitions
  const missingFields = customFieldNames.filter(
    (name) => !fieldMap.has(name)
  );

  if (missingFields.length > 0) {
    const newFields = missingFields.map((fieldName) => ({
      organization_id: organizationId,
      field_name: fieldName,
      field_type: "text" as const,
    }));

    const { data: createdFields, error: createError } = await supabase
      .from("contact_custom_field_definitions")
      .insert(newFields)
      .select("id, field_name");

    if (createError) {
      throw new Error(
        `Failed to create custom field definitions: ${createError.message}`
      );
    }

    // Add created fields to map
    for (const field of createdFields || []) {
      fieldMap.set(field.field_name, field.id);
    }
  }

  return fieldMap;
}

/**
 * Bulk inserts custom field values into contact_custom_field_values table
 * Handles partial failures gracefully
 */
export async function bulkInsertCustomFieldValues(
  contactIdMap: Map<string, string>,
  normalizedContacts: NormalizedContact[],
  organizationId: string,
  userId: string
): Promise<void> {
  if (normalizedContacts.length === 0 || contactIdMap.size === 0) {
    return;
  }

  // Collect all custom field names
  const customFieldNames = new Set<string>();
  for (const contact of normalizedContacts) {
    Object.keys(contact.custom_fields).forEach((name) =>
      customFieldNames.add(name)
    );
  }

  if (customFieldNames.size === 0) {
    return;
  }

  // Get or create custom field definitions
  const fieldDefinitionMap = await getOrCreateCustomFieldDefinitions(
    Array.from(customFieldNames),
    organizationId,
    userId
  );

  // Prepare custom field values
  const customFieldValues: CustomFieldValue[] = [];

  for (const contact of normalizedContacts) {
    const contactEmail = contact.email?.toLowerCase();
    if (!contactEmail) continue;

    const contactId = contactIdMap.get(contactEmail);
    if (!contactId) continue;

    for (const [fieldName, fieldValue] of Object.entries(
      contact.custom_fields
    )) {
      if (!fieldValue || fieldValue.trim() === "") continue;

      const fieldDefinitionId = fieldDefinitionMap.get(fieldName);
      if (!fieldDefinitionId) continue;

      customFieldValues.push({
        contact_id: contactId,
        field_definition_id: fieldDefinitionId,
        value_text: fieldValue,
        value_number: null,
        value_date: null,
        value_boolean: null,
        value_json: null,
      });
    }
  }

  if (customFieldValues.length === 0) {
    return;
  }

  // Insert in batches
  const errors: string[] = [];

  for (let i = 0; i < customFieldValues.length; i += BATCH_SIZE) {
    const batch = customFieldValues.slice(i, i + BATCH_SIZE);

    try {
      const { error } = await supabase
        .from("contact_custom_field_values")
        .insert(batch);

      if (error) {
        errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`);
        // Continue with next batch even if this one fails
        continue;
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error";
      errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${errorMessage}`);
      // Continue with next batch
    }
  }

  // Log warnings if some batches failed but others succeeded
  if (errors.length > 0) {
    console.warn(
      `Partial failure during custom field insertion: ${errors.length} batch(es) failed, some fields inserted successfully`
    );
  }
}

/**
 * Prepares contact data for insertion
 */
export function prepareContactData(
  contact: NormalizedContact,
  context: {
    organizationId: string;
    userId: string;
    source: string;
  }
): ContactInsertData {
  return {
    organization_id: context.organizationId,
    email: contact.email ?? null,
    first_name: contact.first_name ?? null,
    last_name: contact.last_name ?? null,
    mobile: contact.mobile ?? null,
    country: contact.country ?? null,
    source: context.source as any,
    is_active: true,
    is_subscribed: true,
    created_by: context.userId,
  };
}
