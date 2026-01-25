/**
 * Service layer for tag operations
 * 
 * Responsibilities:
 * - Validate tag payload
 * - Enforce organization context
 * - Call repository methods
 * - Return normalized responses
 * 
 * Follows the same structure and error patterns used in contacts services
 */

import type {
  CreateTagPayload,
  Tag,
  ListTagsQuery,
  ListTagsResult,
  TagContext,
  AssignTagsPayload,
  AssignTagsResult,
} from "./tags.types";
import {
  createTag,
  listTags,
  getTagById,
  getTagsByIds,
  getContactTagAssignments,
  bulkInsertTagAssignments,
  prepareTagData,
  type PaginationParams,
  type ListTagsFilters,
} from "./tags.repository";
import { supabase } from "../../../lib/supabase";

/**
 * Maximum tag name length
 */
const MAX_NAME_LENGTH = 100;

/**
 * Minimum tag name length
 */
const MIN_NAME_LENGTH = 1;

/**
 * Creates a new tag
 * 
 * Validates:
 * - Tag name is required and within length limits
 * - Tag name is unique per organization
 * 
 * Enforces:
 * - organization_id from context (not from payload)
 * - created_by from context
 * 
 * @param payload - Tag payload from client (NO organization_id)
 * @param context - Tag context with organization_id and user_id
 * @returns Created tag
 * @throws Error if validation fails
 */
export async function createTagService(
  payload: CreateTagPayload,
  context: TagContext
): Promise<Tag> {
  // Validate organization context
  if (!context.organization_id || !context.user_id) {
    throw new Error("Invalid tag context: organization_id and user_id are required");
  }

  // Validate required fields
  if (!payload.name || typeof payload.name !== "string") {
    throw new Error("Tag name is required");
  }

  const trimmedName = payload.name.trim();

  // Validate name length
  if (trimmedName.length < MIN_NAME_LENGTH) {
    throw new Error(`Tag name must be at least ${MIN_NAME_LENGTH} character(s)`);
  }

  if (trimmedName.length > MAX_NAME_LENGTH) {
    throw new Error(`Tag name must not exceed ${MAX_NAME_LENGTH} characters`);
  }

  // Prepare tag data (organization_id enforced from context)
  const tagData = prepareTagData(
    {
      name: trimmedName,
      color: payload.color,
    },
    context
  );

  // Create tag (organization_id enforced in repository)
  return await createTag(tagData, context);
}

/**
 * Lists tags with pagination and optional filters
 * 
 * Validates:
 * - Pagination parameters (page >= 1, limit between 1 and 100)
 * 
 * Enforces:
 * - organization_id from query (must match context)
 * 
 * @param query - List tags query with organization_id, pagination, and filters
 * @returns Paginated list of tags
 * @throws Error if validation fails
 */
export async function listTagsService(
  query: ListTagsQuery
): Promise<ListTagsResult> {
  // Validate organization_id
  if (!query.organization_id) {
    throw new Error("organization_id is required");
  }

  // Validate pagination
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(Math.max(1, query.limit || 50), 100); // Between 1 and 100

  // Prepare pagination params
  const pagination: PaginationParams = {
    page,
    limit,
  };

  // Prepare filters
  const filters: ListTagsFilters | undefined = query.search
    ? { search: query.search }
    : undefined;

  // Call repository (organization_id enforced in repository)
  const { tags, total } = await listTags(
    query.organization_id,
    pagination,
    filters
  );

  // Calculate total pages
  const totalPages = Math.ceil(total / limit);

  // Return normalized response
  return {
    tags,
    pagination: {
      page,
      limit,
      total,
      total_pages: totalPages,
    },
  };
}

/**
 * Gets a tag by ID
 * 
 * Enforces:
 * - organization_id scope (tag must belong to organization)
 * 
 * @param tagId - Tag ID
 * @param organizationId - Organization ID (required for security)
 * @returns Tag if found, null otherwise
 * @throws Error if organizationId is missing or query fails
 */
export async function getTagByIdService(
  tagId: string,
  organizationId: string
): Promise<Tag | null> {
  // Validate parameters
  if (!tagId) {
    throw new Error("Tag ID is required");
  }

  if (!organizationId) {
    throw new Error("Organization ID is required");
  }

  // Get tag (organization_id enforced in repository)
  return await getTagById(tagId, organizationId);
}

/**
 * Assigns tags to a contact
 * 
 * Validates:
 * - Contact ID is required
 * - Tag IDs array is provided
 * - All tag IDs belong to the organization
 * - Contact belongs to the organization
 * 
 * Enforces:
 * - organization_id scope for all operations
 * - Avoids duplicate assignments
 * 
 * @param payload - Assign tags payload
 * @param context - Tag context with organization_id and user_id
 * @returns AssignTagsResult with counts
 * @throws Error if validation fails
 */
export async function assignTagsService(
  payload: AssignTagsPayload,
  context: TagContext
): Promise<AssignTagsResult> {
  // Validate organization context
  if (!context.organization_id || !context.user_id) {
    throw new Error("Invalid tag context: organization_id and user_id are required");
  }

  // Validate payload
  if (!payload.contact_id) {
    throw new Error("Contact ID is required");
  }

  if (!Array.isArray(payload.tag_ids) || payload.tag_ids.length === 0) {
    throw new Error("At least one tag ID is required");
  }

  // Validate contact belongs to organization
  const { data: contact, error: contactError } = await supabase
    .from("contacts")
    .select("id")
    .eq("id", payload.contact_id)
    .eq("organization_id", context.organization_id)
    .single();

  if (contactError || !contact) {
    throw new Error("Contact not found or does not belong to this organization");
  }

  // Validate all tags belong to organization
  const tags = await getTagsByIds(payload.tag_ids, context.organization_id);

  if (tags.length !== payload.tag_ids.length) {
    const foundTagIds = new Set(tags.map((t) => t.id));
    const missingTagIds = payload.tag_ids.filter((id) => !foundTagIds.has(id));
    throw new Error(
      `Some tags not found or do not belong to this organization: ${missingTagIds.join(", ")}`
    );
  }

  // Get existing assignments to avoid duplicates
  const existingAssignments = await getContactTagAssignments(
    payload.contact_id,
    context.organization_id
  );

  // Filter out tags that are already assigned
  const newTagIds = payload.tag_ids.filter(
    (tagId) => !existingAssignments.has(tagId)
  );

  const skippedCount = payload.tag_ids.length - newTagIds.length;

  // Insert new assignments
  let assignedCount = 0;
  if (newTagIds.length > 0) {
    const assignmentsToInsert = newTagIds.map((tagId) => ({
      contact_id: payload.contact_id,
      tag_id: tagId,
      organization_id: context.organization_id,
      assigned_by: context.user_id,
    }));

    assignedCount = await bulkInsertTagAssignments(assignmentsToInsert);
  }

  // Get total tag count for contact
  const totalTags = existingAssignments.size + assignedCount;

  return {
    contact_id: payload.contact_id,
    assigned_count: assignedCount,
    skipped_count: skippedCount,
    total_tags: totalTags,
  };
}
