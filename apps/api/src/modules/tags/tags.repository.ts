/**
 * Repository for tag database operations
 * 
 * Follows the same patterns as contacts repository:
 * - All queries scoped by organization_id
 * - Consistent error handling
 * - Proper type safety
 */

import type {
  TagInsertData,
  Tag,
  TagListItem,
  ListTagsQuery,
} from "./tags.types";
import { supabase } from "../../../lib/supabase";

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
}

/**
 * List tags filter options
 */
export interface ListTagsFilters {
  search?: string;
}

/**
 * Creates a new tag
 * 
 * @param data - Tag data to insert (organization_id and created_by from context)
 * @param context - Tag context with organization_id and user_id
 * @returns Created tag
 */
export async function createTag(
  data: TagInsertData,
  context: TagContext
): Promise<Tag> {
  // Ensure organization_id matches context (security enforcement)
  if (data.organization_id !== context.organization_id) {
    throw new Error("Tag organization_id must match context organization_id");
  }

  const { data: tag, error } = await supabase
    .from("contact_tags")
    .insert(data)
    .select()
    .single();

  if (error) {
    // Check for unique constraint violation (duplicate tag name)
    if (error.code === "23505") {
      throw new Error(`Tag with name "${data.name}" already exists in this organization`);
    }
    throw new Error(`Failed to create tag: ${error.message}`);
  }

  return tag;
}

/**
 * Lists tags with pagination and optional filters
 * 
 * @param organizationId - Organization ID to scope the query (required)
 * @param pagination - Pagination parameters (page, limit)
 * @param filters - Optional filters (search)
 * @returns Paginated list of tags
 */
export async function listTags(
  organizationId: string,
  pagination?: PaginationParams,
  filters?: ListTagsFilters
): Promise<{
  tags: TagListItem[];
  total: number;
}> {
  const page = pagination?.page || 1;
  const limit = Math.min(pagination?.limit || 50, 100); // Max 100 per page
  const offset = (page - 1) * limit;

  // Build base query - always scoped by organization_id
  let tagsQuery = supabase
    .from("contact_tags")
    .select("*", { count: "exact" })
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  // Apply search filter if provided
  if (filters?.search && filters.search.trim()) {
    const searchTerm = `%${filters.search.trim()}%`;
    tagsQuery = tagsQuery.ilike("name", searchTerm);
  }

  // Execute query
  const { data: tags, error, count } = await tagsQuery;

  if (error) {
    throw new Error(`Failed to fetch tags: ${error.message}`);
  }

  // Map to TagListItem
  const tagList: TagListItem[] = (tags || []).map((tag) => ({
    id: tag.id,
    organization_id: tag.organization_id,
    name: tag.name,
    color: tag.color,
    created_at: tag.created_at,
    created_by: tag.created_by,
  }));

  return {
    tags: tagList,
    total: count || 0,
  };
}

/**
 * Gets a tag by ID
 * 
 * @param id - Tag ID
 * @param organizationId - Organization ID to scope the query (required for security)
 * @returns Tag if found, null otherwise
 */
export async function getTagById(
  id: string,
  organizationId: string
): Promise<Tag | null> {
  const { data: tag, error } = await supabase
    .from("contact_tags")
    .select("*")
    .eq("id", id)
    .eq("organization_id", organizationId) // Always scope by organization_id
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // Not found
      return null;
    }
    throw new Error(`Failed to fetch tag: ${error.message}`);
  }

  return tag;
}

/**
 * Gets tags by IDs (for validation)
 * 
 * @param tagIds - Array of tag IDs
 * @param organizationId - Organization ID to scope the query
 * @returns Array of tags that exist and belong to organization
 */
export async function getTagsByIds(
  tagIds: string[],
  organizationId: string
): Promise<Tag[]> {
  if (tagIds.length === 0) {
    return [];
  }

  const { data: tags, error } = await supabase
    .from("contact_tags")
    .select("*")
    .eq("organization_id", organizationId)
    .in("id", tagIds);

  if (error) {
    throw new Error(`Failed to fetch tags: ${error.message}`);
  }

  return tags || [];
}

/**
 * Gets existing tag assignments for a contact
 * 
 * @param contactId - Contact ID
 * @param organizationId - Organization ID (for security)
 * @returns Set of tag IDs already assigned to the contact
 */
export async function getContactTagAssignments(
  contactId: string,
  organizationId: string
): Promise<Set<string>> {
  const { data: assignments, error } = await supabase
    .from("contact_tag_assignments")
    .select("tag_id")
    .eq("contact_id", contactId)
    .eq("organization_id", organizationId);

  if (error) {
    throw new Error(`Failed to fetch tag assignments: ${error.message}`);
  }

  return new Set((assignments || []).map((a) => a.tag_id));
}

/**
 * Bulk inserts tag assignments
 * 
 * Handles duplicate constraint violations gracefully (unique constraint on contact_id, tag_id)
 * 
 * @param assignments - Array of assignment data to insert
 * @returns Number of successfully inserted assignments
 */
export async function bulkInsertTagAssignments(
  assignments: Array<{
    contact_id: string;
    tag_id: string;
    organization_id: string;
    assigned_by: string;
  }>
): Promise<number> {
  if (assignments.length === 0) {
    return 0;
  }

  let insertedCount = 0;
  const errors: string[] = [];

  // Insert in batches of 500
  const BATCH_SIZE = 500;

  for (let i = 0; i < assignments.length; i += BATCH_SIZE) {
    const batch = assignments.slice(i, i + BATCH_SIZE);

    try {
      const { data, error } = await supabase
        .from("contact_tag_assignments")
        .insert(batch)
        .select("id");

      if (error) {
        // Check if it's a unique constraint violation (duplicate contact_id, tag_id)
        if (error.code === "23505") {
          // Handle individual conflicts - try inserting one by one
          for (const assignment of batch) {
            try {
              const { error: singleError } = await supabase
                .from("contact_tag_assignments")
                .insert(assignment)
                .select("id")
                .single();

              if (!singleError) {
                insertedCount++;
              }
              // If error, it's a duplicate - skip silently
            } catch {
              // Skip this assignment, continue with next
            }
          }
        } else {
          errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`);
        }
        continue;
      }

      // Count successfully inserted assignments
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
      `Partial failure during tag assignment insertion: ${errors.length} batch(es) failed, ${insertedCount} assignment(s) inserted successfully`
    );
  }

  return insertedCount;
}

/**
 * Prepares tag data for insertion
 * 
 * @param data - Tag payload data
 * @param context - Tag context with organization_id and user_id
 * @returns TagInsertData ready for database insertion
 */
export function prepareTagData(
  data: {
    name: string;
    color?: string;
  },
  context: TagContext
): TagInsertData {
  return {
    organization_id: context.organization_id,
    name: data.name.trim(),
    color: data.color?.trim() || null,
    created_by: context.user_id,
  };
}
