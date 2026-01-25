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

  // Apply tag filters first to get filtered contact IDs (before main query for efficiency)
  let contactIdsToFilter: string[] | null = null;

  if (query.include_tags && query.include_tags.length > 0) {
    // Get contact IDs that have ALL of the include_tags (AND logic)
    // For each tag, get contacts that have it, then find intersection
    const tagContactSets: Set<string>[] = [];

    for (const tagId of query.include_tags) {
      const { data: assignments, error: tagError } = await supabase
        .from("contact_tag_assignments")
        .select("contact_id")
        .eq("organization_id", query.organization_id)
        .eq("tag_id", tagId);

      if (tagError) {
        throw new Error(`Failed to fetch tag assignments: ${tagError.message}`);
      }

      const contactIds = new Set((assignments || []).map((a) => a.contact_id));
      tagContactSets.push(contactIds);
    }

    // Find intersection: contacts that have ALL tags
    if (tagContactSets.length > 0) {
      let intersection = tagContactSets[0];
      for (let i = 1; i < tagContactSets.length; i++) {
        intersection = new Set(
          Array.from(intersection).filter((id) => tagContactSets[i].has(id))
        );
      }
      contactIdsToFilter = Array.from(intersection);
    } else {
      contactIdsToFilter = [];
    }
  }

  if (query.exclude_tags && query.exclude_tags.length > 0) {
    // Get contact IDs that have ANY of the exclude_tags (to exclude them)
    const { data: excludeAssignments, error: excludeError } = await supabase
      .from("contact_tag_assignments")
      .select("contact_id")
      .eq("organization_id", query.organization_id)
      .in("tag_id", query.exclude_tags);

    if (excludeError) {
      throw new Error(`Failed to fetch tag assignments: ${excludeError.message}`);
    }

    const excludedContactIds = new Set(
      (excludeAssignments || []).map((a) => a.contact_id)
    );

    if (contactIdsToFilter !== null) {
      // Filter out excluded contacts from the include filter results
      contactIdsToFilter = contactIdsToFilter.filter(
        (id) => !excludedContactIds.has(id)
      );
    } else {
      // For exclude-only: get all active contact IDs, then remove excluded ones
      const { data: allContacts, error: allContactsError } = await supabase
        .from("contacts")
        .select("id")
        .eq("organization_id", query.organization_id)
        .eq("is_active", true);

      if (allContactsError) {
        throw new Error(`Failed to fetch contacts: ${allContactsError.message}`);
      }

      const allContactIds = (allContacts || []).map((c) => c.id);
      contactIdsToFilter = allContactIds.filter(
        (id) => !excludedContactIds.has(id)
      );
    }
  }

  // Build base query
  let contactsQuery = supabase
    .from("contacts")
    .select("*", { count: "exact" })
    .eq("organization_id", query.organization_id)
    .eq("is_active", true) // Only active contacts
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  // Apply tag filter to query if we have filtered contact IDs
  if (contactIdsToFilter !== null) {
    if (contactIdsToFilter.length === 0) {
      // No contacts match the tag filters, return empty result
      return {
        contacts: [],
        total: 0,
      };
    }
    contactsQuery = contactsQuery.in("id", contactIdsToFilter);
  }

  // Apply search filter if provided
  if (query.search && query.search.trim()) {
    const searchTerm = `%${query.search.trim()}%`;
    contactsQuery = contactsQuery.or(
      `email.ilike.${searchTerm},first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},mobile.ilike.${searchTerm}`
    );
  }

  // Apply country exclusion filter if provided
  if (query.exclude_countries && query.exclude_countries.length > 0) {
    // Normalize country codes to lowercase for comparison
    const excludeCountriesLower = query.exclude_countries.map((c) => c.toLowerCase().trim()).filter((c) => c);
    if (excludeCountriesLower.length > 0) {
      // Supabase/PostgREST: Use .not() with "in" operator for exclusion
      // Format: .not("column", "in", "(value1,value2)") - values should be quoted for strings
      const countryList = excludeCountriesLower.map((c) => `"${c}"`).join(",");
      contactsQuery = contactsQuery.not("country", "in", `(${countryList})`);
    }
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
    country: contact.country,
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
