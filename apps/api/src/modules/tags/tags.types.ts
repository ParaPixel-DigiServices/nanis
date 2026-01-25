/**
 * Type definitions for Tags module
 */

/**
 * Tag entity (aligned with contact_tags table)
 */
export interface Tag {
  id: string;
  organization_id: string;
  name: string;
  color: string | null;
  created_at: string;
  created_by: string | null;
}

/**
 * Tag payload from client (NO organization_id - enforced from context)
 */
export interface CreateTagPayload {
  name: string;
  color?: string;
}

/**
 * Tag response DTO
 */
export interface TagResponse {
  id: string;
  organization_id: string;
  name: string;
  color: string | null;
  created_at: string;
  created_by: string | null;
}

/**
 * Tag list item
 */
export interface TagListItem {
  id: string;
  organization_id: string;
  name: string;
  color: string | null;
  created_at: string;
  created_by: string | null;
}

/**
 * List tags result
 */
export interface ListTagsResult {
  tags: TagListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

/**
 * Query for listing tags (organization_id enforced from context)
 */
export interface ListTagsQuery {
  organization_id: string;
  page?: number;
  limit?: number;
  search?: string;
}

/**
 * Tag insert data (internal use only - organization_id from context)
 */
export interface TagInsertData {
  organization_id: string;
  name: string;
  color?: string | null;
  created_by: string;
}

/**
 * Context for tag operations (organization_id enforced here)
 */
export interface TagContext {
  organization_id: string;
  user_id: string;
}

/**
 * Tag assignment entity (aligned with contact_tag_assignments table)
 */
export interface TagAssignment {
  id: string;
  contact_id: string;
  tag_id: string;
  organization_id: string;
  assigned_at: string;
  assigned_by: string | null;
}

/**
 * Assign tags payload
 */
export interface AssignTagsPayload {
  contact_id: string;
  tag_ids: string[];
}

/**
 * Assign tags result
 */
export interface AssignTagsResult {
  contact_id: string;
  assigned_count: number;
  skipped_count: number;
  total_tags: number;
}
