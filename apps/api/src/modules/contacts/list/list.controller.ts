/**
 * Controller for contact list API endpoints
 * 
 * Responsibilities:
 * - Parse query parameters
 * - Get organization_id from auth context
 * - Call ListService
 * - Return JSON ListContactsResult
 * - Handle errors safely
 */

import type { ListContactsQuery, ListContactsResult } from "./list.types";
import { listContactsService } from "./list.service";
import { supabase } from "../../../lib/supabase";

export interface ListContactsResponse {
  success: boolean;
  data?: ListContactsResult;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Handles GET /api/contacts
 * 
 * Query parameters:
 * - page?: number (default: 1)
 * - limit?: number (default: 50, max: 100)
 * - search?: string (search by email, name, or mobile)
 * - include_custom_fields?: boolean (default: false)
 * 
 * Returns ListContactsResult with paginated contacts
 */
export async function handleListContacts(
  request: {
    query: {
      page?: string;
      limit?: string;
      search?: string;
      include_custom_fields?: string;
    };
    headers: {
      authorization?: string;
    };
  }
): Promise<ListContactsResponse> {
  try {
    // Step 1: Authenticate user from authorization header
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return {
        success: false,
        error: {
          code: "unauthorized",
          message: "Missing or invalid authorization header",
        },
      };
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return {
        success: false,
        error: {
          code: "unauthorized",
          message: "User not authenticated",
        },
      };
    }

    // Step 2: Get organization_id from auth context
    // Fetch user's organization membership
    const { data: membership, error: membershipError } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (membershipError || !membership) {
      return {
        success: false,
        error: {
          code: "forbidden",
          message: "User is not a member of any organization",
        },
      };
    }

    // Step 3: Parse query parameters
    const page = request.query.page ? parseInt(request.query.page, 10) : undefined;
    const limit = request.query.limit ? parseInt(request.query.limit, 10) : undefined;
    const search = request.query.search?.trim() || undefined;
    const include_custom_fields =
      request.query.include_custom_fields === "true" ||
      request.query.include_custom_fields === "1";

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

    // Step 4: Prepare query
    const query: ListContactsQuery = {
      organization_id: membership.organization_id,
      page,
      limit,
      search,
      include_custom_fields,
    };

    // Step 5: Call ListService
    const result = await listContactsService(query);

    // Step 6: Return JSON ListContactsResult
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
