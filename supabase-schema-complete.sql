-- ============================================================================
-- COMPLETE SUPABASE SCHEMA
-- ============================================================================
-- Complete schema for multi-tenant SaaS supporting:
-- - Contact import (with restore logic)
-- - Contact list view
-- - Campaign creation
-- Platform: Supabase (PostgreSQL)
-- ============================================================================

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. BASE MULTI-TENANT TABLES
-- ============================================================================

-- PROFILES TABLE
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ORGANIZATIONS TABLE
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ORGANIZATION_MEMBERS TABLE
CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure a user can only have one membership per organization
    UNIQUE(organization_id, user_id)
);

-- Indexes for organization_members
CREATE INDEX IF NOT EXISTS idx_organization_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_org ON organization_members(user_id, organization_id);

-- ============================================================================
-- 2. CONTACTS TABLES
-- ============================================================================

-- CONTACTS TABLE
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    mobile TEXT,
    source TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_subscribed BOOLEAN NOT NULL DEFAULT true,
    deleted_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    -- At least one of email or mobile must exist
    CONSTRAINT contacts_email_or_mobile_check 
        CHECK (email IS NOT NULL OR mobile IS NOT NULL)
);

-- Case-insensitive unique email per organization (only for active contacts)
CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_org_email_unique 
    ON contacts(organization_id, LOWER(email)) 
    WHERE email IS NOT NULL AND is_active = true;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_contacts_organization_id ON contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_mobile ON contacts(mobile) WHERE mobile IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_is_active ON contacts(organization_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_contacts_source ON contacts(organization_id, source);
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_created_by ON contacts(created_by) WHERE created_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_deleted_at ON contacts(organization_id, deleted_at) WHERE deleted_at IS NOT NULL;

-- Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_contacts_updated_at
    BEFORE UPDATE ON contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to normalize email (lowercase, trim)
CREATE OR REPLACE FUNCTION normalize_contact_email()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.email IS NOT NULL THEN
        NEW.email = LOWER(TRIM(NEW.email));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER normalize_contacts_email
    BEFORE INSERT OR UPDATE ON contacts
    FOR EACH ROW
    EXECUTE FUNCTION normalize_contact_email();

-- CONTACT_CUSTOM_FIELD_DEFINITIONS TABLE
CREATE TABLE IF NOT EXISTS contact_custom_field_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    field_name TEXT NOT NULL,
    field_type TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Unique field name per organization
    UNIQUE(organization_id, field_name)
);

-- Indexes for custom field definitions
CREATE INDEX IF NOT EXISTS idx_custom_field_definitions_org_id 
    ON contact_custom_field_definitions(organization_id);
CREATE INDEX IF NOT EXISTS idx_custom_field_definitions_org_field 
    ON contact_custom_field_definitions(organization_id, field_name);

-- CONTACT_CUSTOM_FIELD_VALUES TABLE
CREATE TABLE IF NOT EXISTS contact_custom_field_values (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    field_definition_id UUID NOT NULL REFERENCES contact_custom_field_definitions(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    value_text TEXT,
    value_number NUMERIC,
    value_boolean BOOLEAN,
    value_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- One value per field per contact
    UNIQUE(contact_id, field_definition_id),
    
    -- Only one value column should be non-null
    CONSTRAINT custom_field_single_value_check
        CHECK (
            (CASE WHEN value_text IS NOT NULL THEN 1 ELSE 0 END) +
            (CASE WHEN value_number IS NOT NULL THEN 1 ELSE 0 END) +
            (CASE WHEN value_boolean IS NOT NULL THEN 1 ELSE 0 END) +
            (CASE WHEN value_date IS NOT NULL THEN 1 ELSE 0 END)
            <= 1
        )
);

-- Indexes for custom field values
CREATE INDEX IF NOT EXISTS idx_custom_field_values_contact_id 
    ON contact_custom_field_values(contact_id);
CREATE INDEX IF NOT EXISTS idx_custom_field_values_field_def_id 
    ON contact_custom_field_values(field_definition_id);
CREATE INDEX IF NOT EXISTS idx_custom_field_values_org_id
    ON contact_custom_field_values(organization_id);
CREATE INDEX IF NOT EXISTS idx_custom_field_values_text 
    ON contact_custom_field_values(field_definition_id, value_text) 
    WHERE value_text IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_custom_field_values_number 
    ON contact_custom_field_values(field_definition_id, value_number) 
    WHERE value_number IS NOT NULL;

-- ============================================================================
-- 3. CAMPAIGNS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Indexes for campaigns
CREATE INDEX IF NOT EXISTS idx_campaigns_organization_id ON campaigns(organization_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON campaigns(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_by ON campaigns(created_by) WHERE created_by IS NOT NULL;

-- Trigger to automatically update updated_at timestamp for campaigns
CREATE TRIGGER update_campaigns_updated_at
    BEFORE UPDATE ON campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
