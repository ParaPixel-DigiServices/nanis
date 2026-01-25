/**
 * API route for campaign recipients generation
 * POST /api/campaigns/:id/recipients - Generate recipients for a campaign
 */

import { handleGenerateRecipients } from "../../../../../../api/src/modules/campaigns/campaigns.controller";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const authHeader = request.headers.get("authorization");

  const result = await handleGenerateRecipients({
    params: {
      id: params.id,
    },
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

  return NextResponse.json(result.data, { status: 200 });
}
