# Campaign Runner Service

## Overview

The campaign runner service automates the execution of scheduled campaigns by:
1. Detecting campaigns with `status = "scheduled"` and `scheduled_at <= now()`
2. Generating recipients if they don't already exist
3. Updating campaign status to `"sending"`

## Usage

### Manual Execution

```typescript
import { runCampaignAutomation } from "./runner.service";

// Process all organizations
const result = await runCampaignAutomation();

// Process specific organization
const result = await runCampaignAutomation("organization-id");
```

### API Endpoint

```bash
# Process all organizations
POST /api/campaigns/run-automation

# Process specific organization
POST /api/campaigns/run-automation?organization_id=org-id
```

### Cron Job Setup

Set up a cron job to run every minute:

```bash
# Example cron job (runs every minute)
* * * * * curl -X POST https://your-domain.com/api/campaigns/run-automation \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Supabase Edge Function

Create a Supabase Edge Function that calls the runner:

```typescript
// supabase/functions/run-campaigns/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { runCampaignAutomation } from "../../apps/api/src/modules/campaigns/runner.service.ts";

serve(async (req) => {
  const result = await runCampaignAutomation();
  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json" },
  });
});
```

Then schedule it in Supabase Dashboard or via SQL:

```sql
-- Schedule to run every minute
SELECT cron.schedule(
  'run-campaign-automation',
  '* * * * *', -- Every minute
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/run-campaigns',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  ) AS request_id;
  $$
);
```

## Idempotency

The runner is designed to be idempotent:
- If recipients already exist, generation is skipped
- If campaign status is already `"sending"`, update is skipped
- Errors in one campaign don't stop processing of others

## System User

The runner uses a system user ID for automated operations. Configure via environment variable:

```bash
SYSTEM_USER_ID=your-system-user-uuid
```

Make sure this user exists in `profiles` and has appropriate permissions in `organization_members`.

## Response Format

```typescript
{
  processed_count: number;
  campaigns: Array<{
    campaign_id: string;
    organization_id: string;
    name: string;
    previous_status: string;
    new_status: string;
    recipients_generated: boolean;
    recipient_count: number;
  }>;
  errors: Array<{
    campaign_id: string;
    error: string;
  }>;
}
```
