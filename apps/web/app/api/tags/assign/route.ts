/**
 * API route for assigning tags to contacts
 * POST /api/tags/assign - Assign tags to a contact
 */

import { handleAssignTags } from "../../../../../api/src/modules/tags/tags.controller";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function POST(
  request: NextRequest
): Promise<NextResponse> {
  const body = await request.json();
  const authHeader = request.headers.get("authorization");

  const result = await handleAssignTags({
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

  return NextResponse.json(result.data, { status: 200 });
}
