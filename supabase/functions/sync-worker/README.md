# sync-worker (placeholder)

Supabase Edge Function stub for long-running sync batches. Phase 1 drains short inbound batches via Vercel Cron + `/api/cron/drain-queue`. Promote this function when full-sync jobs exceed serverless timeouts.

Deploy with Supabase CLI (`supabase functions deploy sync-worker`) once secrets + queue consumers are wired.
