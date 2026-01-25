/**
 * Controller for campaign runner API endpoints
 * 
 * Responsibilities:
 * - Provide API endpoint for triggering campaign automation
 * - Handle authentication (optional for system/internal calls)
 * - Return processing results
 * - Handle errors safely
 * 
 * Note: This endpoint can be called:
 * - Manually for testing
 * - By cron jobs (with API key authentication)
 * - By Supabase Edge Functions (with service role key)
 */

import { runCampaignAutomation } from "./runner.service";
import type { RunCampaignAutomationResult } from "./runner.service";

export interface RunCampaignAutomationResponse {
  success: boolean;
  data?: RunCampaignAutomationResult;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Handles POST /api/campaigns/run-automation
 * 
 * This endpoint triggers the campaign automation runner.
 * It can be called:
 * - Manually for testing
 * - By cron jobs (with proper authentication)
 * - By Supabase Edge Functions
 * 
 * Query parameters:
 * - organization_id?: string (optional, to scope processing to one organization)
 * 
 * Returns RunCampaignAutomationResult with processing details
 */
export async function handleRunCampaignAutomation(
  request: {
    query?: {
      organization_id?: string;
    };
    headers?: {
      authorization?: string;
    };
  }
): Promise<RunCampaignAutomationResponse> {
  try {
    // Optional: Validate API key for cron/edge function calls
    // For now, we'll allow unauthenticated calls (can be secured later)
    // In production, you might want to check for a service role key or API key

    // Extract organization_id from query if provided
    const organizationId = request.query?.organization_id;

    // Run campaign automation
    const result = await runCampaignAutomation(organizationId);

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
