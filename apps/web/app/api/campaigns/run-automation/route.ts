/**
 * API route for campaign automation runner
 * POST /api/campaigns/run-automation - Trigger campaign automation
 * 
 * This endpoint can be called by:
 * - Cron jobs (with API key)
 * - Supabase Edge Functions
 * - Manual testing
 * 
 * Query parameters:
 * - organization_id?: string (optional, to scope processing)
 */

import { handleRunCampaignAutomation } from "../../../../../api/src/modules/campaigns/runner.controller";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function POST(
  request: NextRequest
): Promise<NextResponse> {
  // Parse query parameters
  const searchParams = request.nextUrl.searchParams;
  const organizationId = searchParams.get("organization_id") || undefined;

  const authHeader = request.headers.get("authorization");

  const result = await handleRunCampaignAutomation({
    query: {
      organization_id: organizationId,
    },
    headers: {
      authorization: authHeader || undefined,
    },
  });

  if (!result.success) {
    return NextResponse.json(
      {
        error: result.error?.code || "error",
        message: result.error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }

  return NextResponse.json(result.data, { status: 200 });
}
