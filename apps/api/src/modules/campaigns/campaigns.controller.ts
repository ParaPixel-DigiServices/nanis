/**
 * Controller for campaign API endpoints
 * 
 * Responsibilities:
 * - Parse request body/query parameters
 * - Get organization_id from auth context
 * - Call CampaignService
 * - Return JSON responses
 * - Handle errors safely
 */

import type {
  CreateCampaignPayload,
  ListCampaignsQuery,
  Campaign,
  CampaignResponse as CampaignResponseDTO,
  ListCampaignsResult,
  CampaignStatus,
  GenerateRecipientsResult,
} from "./campaigns.types";
import {
  createCampaignService,
  listCampaignsService,
  getCampaignByIdService,
} from "./campaigns.service";
import { generateCampaignRecipients } from "./recipients.service";
import { supabase } from "../../../lib/supabase";

export interface CampaignResponse {
  success: boolean;
  data?: CampaignResponseDTO;
  error?: {
    code: string;
    message: string;
  };
}

export interface ListCampaignsResponse {
  success: boolean;
  data?: ListCampaignsResult;
  error?: {
    code: string;
    message: string;
  };
}

export interface GenerateRecipientsResponse {
  success: boolean;
  data?: GenerateRecipientsResult;
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
 * Handles POST /api/campaigns
 * 
 * Request body:
 * - name: string (required)
 * - status?: "draft" | "scheduled" | "sending" | "sent" | "paused"
 * 
 * Note: organization_id is enforced from auth context, NOT from client input
 * 
 * Returns CampaignResponse
 */
export async function handleCreateCampaign(
  request: {
    body: CreateCampaignPayload;
    headers: {
      authorization?: string;
    };
  }
): Promise<CampaignResponse> {
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
          message: "Campaign name is required",
        },
      };
    }

    // Step 3: Create campaign (organization_id enforced from context)
    const campaign = await createCampaignService(request.body, context);

    // Step 4: Map Campaign to CampaignResponse DTO
    const campaignResponse: CampaignResponseDTO = {
      id: campaign.id,
      organization_id: campaign.organization_id,
      name: campaign.name,
      status: campaign.status,
      scheduled_at: campaign.scheduled_at || null,
      created_at: campaign.created_at,
      updated_at: campaign.updated_at,
      created_by: campaign.created_by,
    };

    return {
      success: true,
      data: campaignResponse,
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
 * Handles GET /api/campaigns
 * 
 * Query parameters:
 * - page?: number (default: 1)
 * - limit?: number (default: 50, max: 100)
 * - status?: "draft" | "scheduled" | "sending" | "sent" | "paused"
 * 
 * Returns ListCampaignsResult with paginated campaigns
 */
export async function handleListCampaigns(
  request: {
    query: {
      page?: string;
      limit?: string;
      status?: string;
    };
    headers: {
      authorization?: string;
    };
  }
): Promise<ListCampaignsResponse> {
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
    const status = request.query.status as CampaignStatus | undefined;

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

    // Validate status if provided
    const validStatuses = ["draft", "scheduled", "sending", "sent", "paused"];
    if (status && !validStatuses.includes(status)) {
      return {
        success: false,
        error: {
          code: "validation_error",
          message: `status must be one of: ${validStatuses.join(", ")}`,
        },
      };
    }

    // Step 3: Prepare query
    const query: ListCampaignsQuery = {
      organization_id: context.organization_id,
      page,
      limit,
      status,
    };

    // Step 4: Call ListService
    const result = await listCampaignsService(query);

    // Step 5: Return JSON ListCampaignsResult
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
 * Handles GET /api/campaigns/:id
 * 
 * Returns Campaign
 */
export async function handleGetCampaign(
  request: {
    params: {
      id: string;
    };
    headers: {
      authorization?: string;
    };
  }
): Promise<CampaignResponse> {
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

    // Step 2: Validate campaign ID
    if (!request.params.id) {
      return {
        success: false,
        error: {
          code: "validation_error",
          message: "Campaign ID is required",
        },
      };
    }

    // Step 3: Get campaign (organization_id enforced from context)
    const campaign = await getCampaignByIdService(
      request.params.id,
      context.organization_id
    );

    if (!campaign) {
      return {
        success: false,
        error: {
          code: "not_found",
          message: "Campaign not found",
        },
      };
    }

    // Step 4: Map Campaign to CampaignResponse DTO (include recipient_count if available)
    const campaignResponse: CampaignResponseDTO = {
      id: campaign.id,
      organization_id: campaign.organization_id,
      name: campaign.name,
      status: campaign.status,
      scheduled_at: campaign.scheduled_at || null,
      created_at: campaign.created_at,
      updated_at: campaign.updated_at,
      created_by: campaign.created_by,
      recipient_count: campaign.recipient_count,
    };

    return {
      success: true,
      data: campaignResponse,
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
 * Handles POST /api/campaigns/:id/recipients
 * 
 * Generates campaign recipients from eligible contacts
 * 
 * Returns GenerateRecipientsResult with recipient count and status
 */
export async function handleGenerateRecipients(
  request: {
    params: {
      id: string;
    };
    headers: {
      authorization?: string;
    };
  }
): Promise<GenerateRecipientsResponse> {
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

    // Step 2: Validate campaign ID
    if (!request.params.id) {
      return {
        success: false,
        error: {
          code: "validation_error",
          message: "Campaign ID is required",
        },
      };
    }

    // Step 3: Generate recipients (organization_id enforced from context)
    const result = await generateCampaignRecipients(
      request.params.id,
      context
    );

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
    if (errorMessage.includes("Campaign not found")) {
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
