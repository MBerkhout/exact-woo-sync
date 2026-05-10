DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_extension
    WHERE extname = 'pg_cron'
  )
     AND EXISTS (
       SELECT 1
       FROM cron.job
       WHERE jobname = 'purge_sync_logs_daily'
     ) THEN
    PERFORM cron.unschedule ('purge_sync_logs_daily');
  END IF;
END
$$;

DROP FUNCTION IF EXISTS public.purge_expired_logs ();

SELECT pgmq.drop_queue ('sync.fullsync');
SELECT pgmq.drop_queue ('sync.outbound');
SELECT pgmq.drop_queue ('sync.inbound');
