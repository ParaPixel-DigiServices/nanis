/**
 * Type definitions for Contact List module
 */

export interface ListContactsQuery {
  organization_id: string;
  page?: number;
  limit?: number;
  search?: string;
  include_custom_fields?: boolean;
  include_tags?: string[]; // Filter contacts that have ALL of these tags
  exclude_tags?: string[]; // Filter contacts that have NONE of these tags
  exclude_countries?: string[]; // Filter contacts that are NOT from these countries (lowercase ISO codes)
}

export interface ContactListItem {
  id: string;
  organization_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  mobile: string | null;
  country: string | null; // ISO country code (lowercase)
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
