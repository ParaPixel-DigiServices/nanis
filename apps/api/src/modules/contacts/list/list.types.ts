/**
 * Type definitions for Contact List module
 */

export interface ListContactsQuery {
  organization_id: string;
  page?: number;
  limit?: number;
  search?: string;
  include_custom_fields?: boolean;
}

export interface ContactListItem {
  id: string;
  organization_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  mobile: string | null;
  source: string;
  is_active: boolean;
  is_subscribed: boolean;
  created_at: string;
  updated_at: string;
  custom_fields?: Array<{
    field_name: string;
    field_value: string;
  }>;
}

export interface ListContactsResult {
  contacts: ContactListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}
