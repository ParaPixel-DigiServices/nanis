/**
 * Controller for contact import API endpoints
 * 
 * Responsibilities:
 * - Parse request body
 * - Get organization_id from auth context (validate user has access)
 * - Call ImportService
 * - Return JSON ImportResult
 * - Handle errors safely
 */

import type { ImportRequest, ImportResult } from "./import.types";
import { importContacts } from "./import.service";
import { supabase } from "../../../lib/supabase";

export interface ImportResponse {
  success: boolean;
  data?: ImportResult;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Handles POST /api/contacts/import
 * 
 * Request body:
 * - rows: Array of contact rows
 * - source: "excel_copy_paste" | "csv_upload" | "xlsx_upload" | "mailchimp_import"
 * - organization_id: string (validated against user's accessible organizations)
 * - column_mapping?: Record<string, string> (optional)
 * 
 * Returns ImportResult with import summary
 */
export async function handleImportContacts(
  request: {
    body: {
      rows: unknown[];
      source: string;
      organization_id: string;
      column_mapping?: Record<string, string>;
    };
    headers: {
      authorization?: string;
    };
  }
): Promise<ImportResponse> {
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

    // Step 2: Parse and validate request body
    const { rows, source, organization_id, column_mapping } = request.body;

    // Validate rows
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return {
        success: false,
        error: {
          code: "validation_error",
          message: "rows must be a non-empty array",
        },
      };
    }

    // Validate source
    const validSources = ["excel_copy_paste", "csv_upload", "xlsx_upload", "mailchimp_import"];
    if (!source || !validSources.includes(source)) {
      return {
        success: false,
        error: {
          code: "validation_error",
          message: `source must be one of: ${validSources.join(", ")}`,
        },
      };
    }

    // Validate organization_id
    if (!organization_id || typeof organization_id !== "string") {
      return {
        success: false,
        error: {
          code: "validation_error",
          message: "organization_id is required",
        },
      };
    }

    // Step 3: Get organization_id from auth context (verify user has access)
    const { data: membership, error: membershipError } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("organization_id", organization_id)
      .eq("user_id", user.id)
      .single();

    if (membershipError || !membership) {
      return {
        success: false,
        error: {
          code: "forbidden",
          message: "User does not have access to this organization",
        },
      };
    }

    // Step 4: Prepare import request and context
    const importRequest: ImportRequest = {
      rows: rows as ImportRequest["rows"],
      source: source as ImportRequest["source"],
      organization_id: membership.organization_id,
      column_mapping,
    };

    const context = {
      organization_id: membership.organization_id,
      user_id: user.id,
      source: source as ImportRequest["source"],
    };

    // Step 5: Call ImportService
    const result = await importContacts(importRequest, context);

    // Step 6: Return JSON ImportResult
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
