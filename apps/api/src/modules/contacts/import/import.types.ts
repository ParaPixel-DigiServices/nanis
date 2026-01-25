/**
 * Type definitions for Contact Import module
 */

export type ImportSource = "excel_copy_paste" | "csv_upload" | "xlsx_upload" | "mailchimp_import";

/**
 * Import payload from UI
 */
export interface ImportPayload {
  source: ImportSource;
  rows: Array<Record<string, string>>;
  organization_id: string;
}

/**
 * Normalized contact data
 */
export interface NormalizedContact {
  first_name?: string;
  last_name?: string;
  email?: string;
  mobile?: string;
  custom_fields: Record<string, string>;
  source: string;
}

/**
 * Import result summary (production-grade)
 */
export interface ImportResult {
  total: number;
  created: number;
  skipped: number;
  restored: number;
  invalid: number;
  errors: Array<{
    rowIndex: number;
    reason: string;
  }>;
}

// Legacy types (kept for backward compatibility with existing code)

export interface RawImportRow {
  [key: string]: string | number | null | undefined;
}

export interface ImportContext {
  organization_id: string;
  user_id: string;
  source: ImportSource;
}

export interface DeduplicationResult {
  contact: NormalizedContact;
  is_duplicate: boolean;
  existing_contact_id?: string;
}

export interface ImportSummary {
  total_rows: number;
  processed: number;
  created: number;
  skipped: number;
  errors: ImportError[];
}

export interface ImportError {
  row_index: number;
  row_data: RawImportRow;
  error_message: string;
}

export interface ImportRequest {
  rows: RawImportRow[];
  source: ImportSource;
  organization_id: string;
  column_mapping?: ColumnMapping;
}

export interface ColumnMapping {
  email?: string;
  first_name?: string;
  last_name?: string;
  mobile?: string;
  [customField: string]: string | undefined;
}

export interface ContactInsertData {
  organization_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  mobile: string | null;
  source: ImportSource;
  is_active: boolean;
  is_subscribed: boolean;
  created_by: string;
}

/**
 * Contact with ID for restore operations
 */
export interface ExistingContact {
  id: string;
  email: string | null;
  is_active: boolean;
  deleted_at: string | null;
}

export interface CustomFieldValue {
  contact_id: string;
  field_definition_id: string;
  value_text: string | null;
  value_number: number | null;
  value_date: string | null;
  value_boolean: boolean | null;
  value_json: unknown | null;
}
