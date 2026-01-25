/**
 * Service layer for contact list operations
 */

import type { ListContactsQuery, ListContactsResult } from "./list.types";
import { listContacts } from "./list.repository";

/**
 * Lists contacts with pagination and optional filters
 */
export async function listContactsService(
  query: ListContactsQuery
): Promise<ListContactsResult> {
  // Validate pagination
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(Math.max(1, query.limit || 50), 100); // Between 1 and 100

  const { contacts, total } = await listContacts({
    ...query,
    page,
    limit,
  });

  const totalPages = Math.ceil(total / limit);

  return {
    contacts,
    pagination: {
      page,
      limit,
      total,
      total_pages: totalPages,
    },
  };
}
