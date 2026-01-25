/**
 * API route for contact import
 * POST /api/contacts/import
 */

import { handleImportContacts } from "../../../../../api/src/modules/contacts/import/import.controller";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function POST(
  request: NextRequest
): Promise<NextResponse> {
  const body = await request.json();
  const authHeader = request.headers.get("authorization");

  const result = await handleImportContacts({
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
