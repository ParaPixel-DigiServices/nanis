/**
 * Controller for tag API endpoints
 * 
 * Responsibilities:
 * - Parse request body/query parameters
 * - Get organization_id from auth context
 * - Call TagService
 * - Return JSON responses
 * - Handle errors safely
 */

import type {
  CreateTagPayload,
  ListTagsQuery,
  Tag,
  TagResponse as TagResponseDTO,
  ListTagsResult,
  AssignTagsPayload,
  AssignTagsResult,
} from "./tags.types";
import {
  createTagService,
  listTagsService,
  getTagByIdService,
  assignTagsService,
} from "./tags.service";
import { supabase } from "../../../lib/supabase";

export interface TagResponse {
  success: boolean;
  data?: TagResponseDTO;
  error?: {
    code: string;
    message: string;
  };
}

export interface ListTagsResponse {
  success: boolean;
  data?: ListTagsResult;
  error?: {
    code: string;
    message: string;
  };
}

export interface AssignTagsResponse {
  success: boolean;
  data?: AssignTagsResult;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Helper to authenticate user and get organization context
 */
async function getAuthContext(
  authHeader?: string
): Promise<{
  user_id: string;
  organization_id: string;
} | null> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return null;
  }

  // Get user's organization membership
  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (membershipError || !membership) {
    return null;
  }

  return {
    user_id: user.id,
    organization_id: membership.organization_id,
  };
}

/**
 * Handles POST /api/tags
 * 
 * Request body:
 * - name: string (required)
 * - color?: string (optional)
 * 
 * Note: organization_id is enforced from auth context, NOT from client input
 * 
 * Returns TagResponse
 */
export async function handleCreateTag(
  request: {
    body: CreateTagPayload;
    headers: {
      authorization?: string;
    };
  }
): Promise<TagResponse> {
  try {
    // Step 1: Authenticate and get organization context
    const context = await getAuthContext(request.headers.authorization);
    if (!context) {
      return {
        success: false,
        error: {
          code: "unauthorized",
          message: "User not authenticated or not a member of any organization",
        },
      };
    }

    // Step 2: Validate request body (organization_id NOT accepted from client)
    if (!request.body.name || typeof request.body.name !== "string") {
      return {
        success: false,
        error: {
          code: "validation_error",
          message: "Tag name is required",
        },
      };
    }

    // Step 3: Create tag (organization_id enforced from context)
    const tag = await createTagService(request.body, context);

    // Step 4: Map Tag to TagResponse DTO
    const tagResponse: TagResponseDTO = {
      id: tag.id,
      organization_id: tag.organization_id,
      name: tag.name,
      color: tag.color,
      created_at: tag.created_at,
      created_by: tag.created_by,
    };

    return {
      success: true,
      data: tagResponse,
    };
  } catch (error) {
    // Handle errors safely
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    // Check for specific error types
    let errorCode = "internal_server_error";
    if (errorMessage.includes("already exists")) {
      errorCode = "validation_error";
    } else if (errorMessage.includes("required")) {
      errorCode = "validation_error";
    }

    return {
      success: false,
      error: {
        code: errorCode,
        message: errorMessage,
      },
    };
  }
}

/**
 * Handles GET /api/tags
 * 
 * Query parameters:
 * - page?: number (default: 1)
 * - limit?: number (default: 50, max: 100)
 * - search?: string (search by tag name)
 * 
 * Returns ListTagsResult with paginated tags
 */
export async function handleListTags(
  request: {
    query: {
      page?: string;
      limit?: string;
      search?: string;
    };
    headers: {
      authorization?: string;
    };
  }
): Promise<ListTagsResponse> {
  try {
    // Step 1: Authenticate and get organization context
    const context = await getAuthContext(request.headers.authorization);
    if (!context) {
      return {
        success: false,
        error: {
          code: "unauthorized",
          message: "User not authenticated or not a member of any organization",
        },
      };
    }

    // Step 2: Parse query parameters
    const page = request.query.page ? parseInt(request.query.page, 10) : undefined;
    const limit = request.query.limit ? parseInt(request.query.limit, 10) : undefined;
    const search = request.query.search?.trim() || undefined;

    // Validate pagination parameters
    if (page !== undefined && (isNaN(page) || page < 1)) {
      return {
        success: false,
        error: {
          code: "validation_error",
          message: "page must be a positive integer",
        },
      };
    }

    if (limit !== undefined && (isNaN(limit) || limit < 1 || limit > 100)) {
      return {
        success: false,
        error: {
          code: "validation_error",
          message: "limit must be between 1 and 100",
        },
      };
    }

    // Step 3: Prepare query
    const query: ListTagsQuery = {
      organization_id: context.organization_id,
      page,
      limit,
      search,
    };

    // Step 4: Call ListService
    const result = await listTagsService(query);

    // Step 5: Return JSON ListTagsResult
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    // Handle errors safely
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    return {
      success: false,
      error: {
        code: "internal_server_error",
        message: errorMessage,
      },
    };
  }
}

/**
 * Handles POST /api/tags/assign
 * 
 * Request body:
 * - contact_id: string (required)
 * - tag_ids: string[] (required, at least one)
 * 
 * Note: organization_id is enforced from auth context
 * 
 * Returns AssignTagsResult
 */
export async function handleAssignTags(
  request: {
    body: AssignTagsPayload;
    headers: {
      authorization?: string;
    };
  }
): Promise<AssignTagsResponse> {
  try {
    // Step 1: Authenticate and get organization context
    const context = await getAuthContext(request.headers.authorization);
    if (!context) {
      return {
        success: false,
        error: {
          code: "unauthorized",
          message: "User not authenticated or not a member of any organization",
        },
      };
    }

    // Step 2: Validate request body
    if (!request.body.contact_id || typeof request.body.contact_id !== "string") {
      return {
        success: false,
        error: {
          code: "validation_error",
          message: "Contact ID is required",
        },
      };
    }

    if (
      !Array.isArray(request.body.tag_ids) ||
      request.body.tag_ids.length === 0
    ) {
      return {
        success: false,
        error: {
          code: "validation_error",
          message: "At least one tag ID is required",
        },
      };
    }

    // Step 3: Assign tags (organization_id enforced from context)
    const result = await assignTagsService(request.body, context);

    // Step 4: Return result
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    // Handle errors safely
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    // Check for specific error types
    let errorCode = "internal_server_error";
    if (errorMessage.includes("not found") || errorMessage.includes("does not belong")) {
      errorCode = "not_found";
    } else if (errorMessage.includes("required")) {
      errorCode = "validation_error";
    }

    return {
      success: false,
      error: {
        code: errorCode,
        message: errorMessage,
      },
    };
  }
}
