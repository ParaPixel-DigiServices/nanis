/**
 * API route for contact list
 * GET /api/contacts
 */

import { handleListContacts } from "../../../../api/src/modules/contacts/list/list.controller";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function GET(
  request: NextRequest
): Promise<NextResponse> {
  // Parse query parameters
  const searchParams = request.nextUrl.searchParams;
  const query = {
    page: searchParams.get("page") || undefined,
    limit: searchParams.get("limit") || undefined,
    search: searchParams.get("search") || undefined,
    include_custom_fields: searchParams.get("include_custom_fields") || undefined,
  };

  const authHeader = request.headers.get("authorization");

  const result = await handleListContacts({
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
