/**
 * Normalizes raw import rows into standardized contact objects
 */

import type { NormalizedContact } from "./import.types";

/**
 * Field aliases for auto-detection
 */
const FIELD_ALIASES = {
  first_name: ["first_name", "firstname", "first name", "fname", "f_name"],
  last_name: ["last_name", "lastname", "last name", "lname", "l_name"],
  full_name: ["full_name", "fullname", "full name", "name"],
  email: ["email", "mail", "e-mail", "e_mail"],
  mobile: ["mobile", "phone", "number", "phone_number", "phone number", "phoneNumber"],
  country: ["country", "country_code", "country code", "countrycode", "iso_country", "iso_country_code"],
} as const;

/**
 * Normalizes a single row into a NormalizedContact
 * Rules:
 * - trim all strings
 * - email = lowercase
 * - empty strings → null/undefined
 * - merge first_name + last_name if only full_name exists
 * - map unknown columns to custom_fields
 */
export function normalizeRow(
  row: Record<string, string>,
  source: string
): NormalizedContact {
  const normalized: NormalizedContact = {
    custom_fields: {},
    source: source,
  };

  // Track which columns have been mapped to standard fields
  const mappedColumns = new Set<string>();

  // Check for full_name first (before first_name/last_name)
  const full_name = detectAndNormalizeField(row, FIELD_ALIASES.full_name);
  const first_name = detectAndNormalizeField(row, FIELD_ALIASES.first_name);
  const last_name = detectAndNormalizeField(row, FIELD_ALIASES.last_name);

  // If full_name exists and first_name/last_name don't, split full_name
  if (full_name !== undefined && !first_name && !last_name) {
    const { firstName, lastName } = splitFullName(full_name);
    if (firstName) normalized.first_name = firstName;
    if (lastName) normalized.last_name = lastName;
    const columnName = findColumnName(row, FIELD_ALIASES.full_name);
    if (columnName) mappedColumns.add(columnName);
  } else {
    // Use first_name and last_name if they exist
    if (first_name !== undefined) {
      normalized.first_name = first_name;
      const columnName = findColumnName(row, FIELD_ALIASES.first_name);
      if (columnName) mappedColumns.add(columnName);
    }

    if (last_name !== undefined) {
      normalized.last_name = last_name;
      const columnName = findColumnName(row, FIELD_ALIASES.last_name);
      if (columnName) mappedColumns.add(columnName);
    }
  }

  // Normalize email (lowercase)
  const email = detectAndNormalizeEmail(row, FIELD_ALIASES.email);
  if (email !== undefined) {
    normalized.email = email;
    const columnName = findColumnName(row, FIELD_ALIASES.email);
    if (columnName) mappedColumns.add(columnName);
  }

  // Normalize mobile
  const mobile = detectAndNormalizeField(row, FIELD_ALIASES.mobile);
  if (mobile !== undefined) {
    normalized.mobile = mobile;
    const columnName = findColumnName(row, FIELD_ALIASES.mobile);
    if (columnName) mappedColumns.add(columnName);
  }

  // Normalize country (lowercase)
  const country = detectAndNormalizeCountry(row, FIELD_ALIASES.country);
  if (country !== undefined) {
    normalized.country = country;
    const columnName = findColumnName(row, FIELD_ALIASES.country);
    if (columnName) mappedColumns.add(columnName);
  }

  // Map remaining columns to custom fields
  for (const [columnName, value] of Object.entries(row)) {
    // Skip if already mapped to standard field
    if (mappedColumns.has(columnName)) continue;

    // Normalize value: trim whitespace, empty string -> undefined
    const normalizedValue = normalizeValue(value);
    if (normalizedValue !== undefined) {
      normalized.custom_fields[columnName] = normalizedValue;
    }
  }

  return normalized;
}

/**
 * Splits full_name into first_name and last_name
 * Simple heuristic: split on first space
 */
function splitFullName(fullName: string): {
  firstName: string | undefined;
  lastName: string | undefined;
} {
  const trimmed = fullName.trim();
  if (!trimmed) {
    return { firstName: undefined, lastName: undefined };
  }

  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return { firstName: trimmed, lastName: undefined };
  }

  // First part is first name, rest is last name
  const firstName = parts[0];
  const lastName = parts.slice(1).join(" ");

  return {
    firstName: firstName || undefined,
    lastName: lastName || undefined,
  };
}

/**
 * Normalizes multiple rows
 */
export function normalizeRows(
  rows: Array<Record<string, string>>,
  source: string
): NormalizedContact[] {
  return rows.map((row) => normalizeRow(row, source));
}

/**
 * Detects and normalizes a standard field using aliases
 */
function detectAndNormalizeField(
  row: Record<string, string>,
  aliases: readonly string[]
): string | undefined {
  for (const alias of aliases) {
    const value = findValueByAlias(row, alias);
    if (value !== undefined) {
      return normalizeValue(value);
    }
  }
  return undefined;
}

/**
 * Detects and normalizes email (with lowercase)
 */
function detectAndNormalizeEmail(
  row: Record<string, string>,
  aliases: readonly string[]
): string | undefined {
  for (const alias of aliases) {
    const value = findValueByAlias(row, alias);
    if (value !== undefined) {
      return normalizeEmail(value);
    }
  }
  return undefined;
}

/**
 * Finds value in row by alias (case-insensitive, handles spaces/underscores)
 */
function findValueByAlias(
  row: Record<string, string>,
  alias: string
): string | undefined {
  const normalizedAlias = normalizeColumnName(alias);

  // Try exact match first
  if (alias in row) {
    return row[alias];
  }

  // Try case-insensitive match
  for (const [key, value] of Object.entries(row)) {
    const normalizedKey = normalizeColumnName(key);
    if (normalizedKey === normalizedAlias) {
      return value;
    }
  }

  return undefined;
}

/**
 * Finds column name in row by alias (for tracking mapped columns)
 */
function findColumnName(
  row: Record<string, string>,
  aliases: readonly string[]
): string | undefined {
  for (const alias of aliases) {
    const normalizedAlias = normalizeColumnName(alias);

    // Try exact match first
    if (alias in row) {
      return alias;
    }

    // Try case-insensitive match
    for (const key of Object.keys(row)) {
      const normalizedKey = normalizeColumnName(key);
      if (normalizedKey === normalizedAlias) {
        return key;
      }
    }
  }
  return undefined;
}

/**
 * Normalizes column name for comparison (lowercase, remove spaces/underscores)
 */
function normalizeColumnName(name: string): string {
  return name.toLowerCase().replace(/[\s_-]/g, "");
}

/**
 * Normalizes a string value: trim whitespace, empty string -> undefined
 */
function normalizeValue(value: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

/**
 * Normalizes email: lowercase, trim, empty string -> undefined
 */
function normalizeEmail(value: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.toLowerCase();
}

/**
 * Detects and normalizes country (with lowercase)
 */
function detectAndNormalizeCountry(
  row: Record<string, string>,
  aliases: readonly string[]
): string | undefined {
  for (const alias of aliases) {
    const value = findValueByAlias(row, alias);
    if (value !== undefined) {
      return normalizeCountry(value);
    }
  }
  return undefined;
}

/**
 * Normalizes country: lowercase, trim, empty string -> undefined
 * Stores as lowercase ISO country code for consistent filtering
 */
function normalizeCountry(value: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.toLowerCase();
}
