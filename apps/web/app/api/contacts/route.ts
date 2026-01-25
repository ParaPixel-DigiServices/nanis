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
  
  // Parse tag filters (support both array and comma-separated formats)
  const include_tags = searchParams.getAll("include_tags").filter((id) => id.trim());
  const exclude_tags = searchParams.getAll("exclude_tags").filter((id) => id.trim());
  const exclude_countries = searchParams.getAll("exclude_countries").map((c) => c.trim().toLowerCase()).filter((c) => c);
  
  // If no array params, try comma-separated format
  const include_tags_str = searchParams.get("include_tags");
  const exclude_tags_str = searchParams.get("exclude_tags");
  const exclude_countries_str = searchParams.get("exclude_countries");
  
  const query = {
    page: searchParams.get("page") || undefined,
    limit: searchParams.get("limit") || undefined,
    search: searchParams.get("search") || undefined,
    include_custom_fields: searchParams.get("include_custom_fields") || undefined,
    include_tags: include_tags.length > 0 
      ? include_tags 
      : include_tags_str 
        ? include_tags_str.split(",").map((id) => id.trim()).filter((id) => id)
        : undefined,
    exclude_tags: exclude_tags.length > 0
      ? exclude_tags
      : exclude_tags_str
        ? exclude_tags_str.split(",").map((id) => id.trim()).filter((id) => id)
        : undefined,
    exclude_countries: exclude_countries.length > 0
      ? exclude_countries
      : exclude_countries_str
        ? exclude_countries_str.split(",").map((c) => c.trim().toLowerCase()).filter((c) => c)
        : undefined,
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
