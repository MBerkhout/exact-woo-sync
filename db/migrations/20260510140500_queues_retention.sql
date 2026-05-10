-- Purge expired sync_logs (§2 data retention). Runs daily via pg_cron when available.
CREATE OR REPLACE FUNCTION public.purge_expired_logs ()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH deleted AS (
    DELETE FROM public.sync_logs
    WHERE expires_at < now ()
    RETURNING id
  )
  SELECT count(*)::bigint FROM deleted;
$$;

REVOKE ALL ON FUNCTION public.purge_expired_logs () FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_expired_logs () TO service_role;

-- pgmq queues for sync workloads (see docs/architecture.md).
SELECT pgmq.create ('sync.inbound');
SELECT pgmq.create ('sync.outbound');
SELECT pgmq.create ('sync.fullsync');

-- Schedule daily purge at 03:00 UTC when pg_cron is installed (Supabase).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_extension
    WHERE extname = 'pg_cron'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM cron.job
      WHERE jobname = 'purge_sync_logs_daily'
    ) THEN
      PERFORM cron.schedule (
        'purge_sync_logs_daily',
        '0 3 * * *',
        'SELECT public.purge_expired_logs();'
      );
    END IF;
  END IF;
END
$$;
