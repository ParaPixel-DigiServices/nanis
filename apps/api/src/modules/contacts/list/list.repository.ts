/**
 * Repository for contact list database operations
 */

import type { ListContactsQuery, ContactListItem } from "./list.types";
import { supabase } from "../../../lib/supabase";

/**
 * Lists contacts with filters, pagination, and optional custom fields
 */
export async function listContacts(
  query: ListContactsQuery
): Promise<{
  contacts: ContactListItem[];
  total: number;
}> {
  const page = query.page || 1;
  const limit = Math.min(query.limit || 50, 100); // Max 100 per page
  const offset = (page - 1) * limit;

  // Build base query
  let contactsQuery = supabase
    .from("contacts")
    .select("*", { count: "exact" })
    .eq("organization_id", query.organization_id)
    .eq("is_active", true) // Only active contacts
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  // Apply search filter if provided
  if (query.search && query.search.trim()) {
    const searchTerm = `%${query.search.trim()}%`;
    contactsQuery = contactsQuery.or(
      `email.ilike.${searchTerm},first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},mobile.ilike.${searchTerm}`
    );
  }

  // Execute contacts query
  const { data: contacts, error: contactsError, count } = await contactsQuery;

  if (contactsError) {
    throw new Error(`Failed to fetch contacts: ${contactsError.message}`);
  }

  const contactList: ContactListItem[] = (contacts || []).map((contact) => ({
    id: contact.id,
    organization_id: contact.organization_id,
    email: contact.email,
    first_name: contact.first_name,
    last_name: contact.last_name,
    mobile: contact.mobile,
    source: contact.source,
    is_active: contact.is_active,
    is_subscribed: contact.is_subscribed,
    created_at: contact.created_at,
    updated_at: contact.updated_at,
  }));

  // Fetch custom fields if requested
  if (query.include_custom_fields && contactList.length > 0) {
    const contactIds = contactList.map((c) => c.id);

    // Fetch custom field values with field definitions
    const { data: customFieldValues, error: customFieldsError } = await supabase
      .from("contact_custom_field_values")
      .select(
        `
        contact_id,
        value_text,
        contact_custom_field_definitions!inner(field_name)
      `
      )
      .in("contact_id", contactIds);

    if (customFieldsError) {
      // Log error but don't fail the entire request
      console.error(
        `Failed to fetch custom fields: ${customFieldsError.message}`
      );
    } else {
      // Group custom fields by contact_id
      const customFieldsMap = new Map<string, Array<{ field_name: string; field_value: string }>>();

      for (const value of customFieldValues || []) {
        const contactId = value.contact_id;
        const fieldDef = value.contact_custom_field_definitions;
        // Handle both single object and array responses from Supabase
        const fieldName = Array.isArray(fieldDef) 
          ? fieldDef[0]?.field_name 
          : (fieldDef as any)?.field_name;
        const fieldValue = value.value_text;

        if (!fieldName || !fieldValue) continue;

        if (!customFieldsMap.has(contactId)) {
          customFieldsMap.set(contactId, []);
        }

        customFieldsMap.get(contactId)!.push({
          field_name: fieldName,
          field_value: fieldValue,
        });
      }

      // Attach custom fields to contacts
      for (const contact of contactList) {
        const customFields = customFieldsMap.get(contact.id);
        if (customFields && customFields.length > 0) {
          contact.custom_fields = customFields;
        }
      }
    }
  }

  return {
    contacts: contactList,
    total: count || 0,
  };
}
