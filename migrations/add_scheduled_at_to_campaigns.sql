-- ============================================================================
-- MIGRATION: Add scheduled_at field to campaigns table
-- ============================================================================
-- Adds scheduled_at field for campaign scheduling
-- ============================================================================

-- Add scheduled_at column to campaigns table
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ NULL;

-- Create index on scheduled_at for efficient scheduler queries
CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled_at 
    ON campaigns(status, scheduled_at) 
    WHERE status = 'scheduled' AND scheduled_at IS NOT NULL;

-- Add comment to column
COMMENT ON COLUMN campaigns.scheduled_at IS 'ISO timestamp for scheduled send. NULL = immediate send. When status = "scheduled" and scheduled_at <= now(), campaign is ready to send.';
