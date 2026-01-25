-- ============================================================================
-- MIGRATION: Add country field to contacts table
-- ============================================================================
-- Adds country field for country-based filtering and exclusion
-- Country codes are stored in lowercase for consistent filtering
-- ============================================================================

-- Add country column to contacts table
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS country TEXT;

-- Create index on country for efficient filtering
CREATE INDEX IF NOT EXISTS idx_contacts_country 
    ON contacts(organization_id, country) 
    WHERE country IS NOT NULL;

-- Create index on country alone for exclusion queries
CREATE INDEX IF NOT EXISTS idx_contacts_country_filter 
    ON contacts(country) 
    WHERE country IS NOT NULL;

-- Add comment to column
COMMENT ON COLUMN contacts.country IS 'ISO country code (lowercase, normalized) for country-based filtering and exclusion';
