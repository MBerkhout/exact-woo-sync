-- Rollback for 20260510142456_connector_cursors (local dev only)
REVOKE SELECT ON public.connector_cursors FROM authenticated;
DROP POLICY IF EXISTS connector_cursors_select ON public.connector_cursors;
ALTER TABLE public.connector_cursors DISABLE ROW LEVEL SECURITY;
DROP INDEX IF EXISTS public.entity_links_pair_kind_source_idx;
DROP TABLE IF EXISTS public.connector_cursors;
