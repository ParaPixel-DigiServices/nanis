/**
 * API route for campaign list and creation
 * GET /api/campaigns - List campaigns
 * POST /api/campaigns - Create campaign
 */

import {
  handleListCampaigns,
  handleCreateCampaign,
} from "../../../../api/src/modules/campaigns/campaigns.controller";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(
  request: NextRequest
): Promise<NextResponse> {
  // Parse query parameters
  const searchParams = request.nextUrl.searchParams;
  const query = {
    page: searchParams.get("page") || undefined,
    limit: searchParams.get("limit") || undefined,
    status: searchParams.get("status") || undefined,
  };

  const authHeader = request.headers.get("authorization");

  const result = await handleListCampaigns({
    query,
    headers: {
      authorization: authHeader || undefined,
    },
  });

  if (!result.success) {
    const statusCode =
      result.error?.code === "unauthorized"
        ? 401
        : result.error?.code === "forbidden"
        ? 403
        : result.error?.code === "validation_error"
        ? 400
        : 500;

    return NextResponse.json(
      {
        error: result.error?.code || "error",
        message: result.error?.message || "Unknown error",
      },
      { status: statusCode }
    );
  }

  return NextResponse.json(result.data, { status: 200 });
}

export async function POST(
  request: NextRequest
): Promise<NextResponse> {
  const body = await request.json();
  const authHeader = request.headers.get("authorization");

  const result = await handleCreateCampaign({
    body,
    headers: {
      authorization: authHeader || undefined,
    },
  });

  if (!result.success) {
    const statusCode =
      result.error?.code === "unauthorized"
        ? 401
        : result.error?.code === "forbidden"
        ? 403
        : result.error?.code === "validation_error"
        ? 400
        : result.error?.code === "not_found"
        ? 404
        : 500;

    return NextResponse.json(
      {
        error: result.error?.code || "error",
        message: result.error?.message || "Unknown error",
      },
      { status: statusCode }
    );
  }

  return NextResponse.json(result.data, { status: 201 });
}
