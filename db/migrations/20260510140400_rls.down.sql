-- Reverse grants / policies (ordering matters).
REVOKE SELECT ON public.content_hashes FROM authenticated;
REVOKE SELECT ON public.suppression_window FROM authenticated;
REVOKE SELECT ON public.dead_letter_jobs FROM authenticated;
REVOKE SELECT ON public.sync_logs FROM authenticated;
REVOKE SELECT ON public.sync_jobs FROM authenticated;
REVOKE SELECT ON public.webhook_deliveries FROM authenticated;
REVOKE SELECT ON public.entity_links FROM authenticated;
REVOKE SELECT ON public.connector_pairs FROM authenticated;
REVOKE SELECT ON public.connector_secrets FROM authenticated;
REVOKE SELECT ON public.connectors FROM authenticated;
REVOKE SELECT ON public.tenant_invites FROM authenticated;
REVOKE SELECT ON public.tenant_members FROM authenticated;
REVOKE SELECT ON public.tenants FROM authenticated;

REVOKE USAGE ON SCHEMA public FROM authenticated;

DROP POLICY IF EXISTS content_hashes_select ON public.content_hashes;
DROP POLICY IF EXISTS suppression_window_select ON public.suppression_window;
DROP POLICY IF EXISTS dead_letter_jobs_select ON public.dead_letter_jobs;
DROP POLICY IF EXISTS sync_logs_select ON public.sync_logs;
DROP POLICY IF EXISTS sync_jobs_select ON public.sync_jobs;
DROP POLICY IF EXISTS webhook_deliveries_select ON public.webhook_deliveries;
DROP POLICY IF EXISTS entity_links_select ON public.entity_links;
DROP POLICY IF EXISTS connector_pairs_select ON public.connector_pairs;
DROP POLICY IF EXISTS connector_secrets_select ON public.connector_secrets;
DROP POLICY IF EXISTS connectors_select ON public.connectors;
DROP POLICY IF EXISTS tenant_invites_select ON public.tenant_invites;
DROP POLICY IF EXISTS tenant_members_select ON public.tenant_members;
DROP POLICY IF EXISTS tenants_select ON public.tenants;

ALTER TABLE public.content_hashes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppression_window DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.dead_letter_jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_links DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.connector_pairs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.connector_secrets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.connectors DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_invites DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants DISABLE ROW LEVEL SECURITY;
