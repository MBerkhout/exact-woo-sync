-- Row Level Security: tenant isolation via tenant_members (§2).
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connector_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connector_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dead_letter_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppression_window ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_hashes ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenants_select ON public.tenants FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1
    FROM public.tenant_members tm
    WHERE tm.tenant_id = tenants.id AND tm.user_id = auth.uid ()
  )
);

CREATE POLICY tenant_members_select ON public.tenant_members FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1
    FROM public.tenant_members tm
    WHERE tm.tenant_id = tenant_members.tenant_id AND tm.user_id = auth.uid ()
  )
);

CREATE POLICY tenant_invites_select ON public.tenant_invites FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1
    FROM public.tenant_members tm
    WHERE tm.tenant_id = tenant_invites.tenant_id
      AND tm.user_id = auth.uid ()
      AND tm.role = 'admin'
  )
);

CREATE POLICY connectors_select ON public.connectors FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1
    FROM public.tenant_members tm
    WHERE tm.tenant_id = connectors.tenant_id AND tm.user_id = auth.uid ()
  )
);

CREATE POLICY connector_secrets_select ON public.connector_secrets FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1
    FROM public.tenant_members tm
    WHERE tm.tenant_id = connector_secrets.tenant_id
      AND tm.user_id = auth.uid ()
      AND tm.role = 'admin'
  )
);

CREATE POLICY connector_pairs_select ON public.connector_pairs FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1
    FROM public.tenant_members tm
    WHERE tm.tenant_id = connector_pairs.tenant_id AND tm.user_id = auth.uid ()
  )
);

CREATE POLICY entity_links_select ON public.entity_links FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1
    FROM public.tenant_members tm
    WHERE tm.tenant_id = entity_links.tenant_id AND tm.user_id = auth.uid ()
  )
);

CREATE POLICY webhook_deliveries_select ON public.webhook_deliveries FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1
    FROM public.connectors c
    INNER JOIN public.tenant_members tm ON tm.tenant_id = c.tenant_id
    WHERE c.id = webhook_deliveries.connector_id AND tm.user_id = auth.uid ()
  )
);

CREATE POLICY sync_jobs_select ON public.sync_jobs FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1
    FROM public.tenant_members tm
    WHERE tm.tenant_id = sync_jobs.tenant_id AND tm.user_id = auth.uid ()
  )
);

CREATE POLICY sync_logs_select ON public.sync_logs FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1
    FROM public.tenant_members tm
    WHERE tm.tenant_id = sync_logs.tenant_id AND tm.user_id = auth.uid ()
  )
);

CREATE POLICY dead_letter_jobs_select ON public.dead_letter_jobs FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1
    FROM public.tenant_members tm
    WHERE tm.tenant_id = dead_letter_jobs.tenant_id AND tm.user_id = auth.uid ()
  )
);

CREATE POLICY suppression_window_select ON public.suppression_window FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1
    FROM public.connectors c
    INNER JOIN public.tenant_members tm ON tm.tenant_id = c.tenant_id
    WHERE c.id = suppression_window.connector_id AND tm.user_id = auth.uid ()
  )
);

CREATE POLICY content_hashes_select ON public.content_hashes FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1
    FROM public.connectors c
    INNER JOIN public.tenant_members tm ON tm.tenant_id = c.tenant_id
    WHERE c.id = content_hashes.connector_id AND tm.user_id = auth.uid ()
  )
);

GRANT USAGE ON SCHEMA public TO authenticated;

GRANT SELECT ON public.tenants TO authenticated;
GRANT SELECT ON public.tenant_members TO authenticated;
GRANT SELECT ON public.tenant_invites TO authenticated;
GRANT SELECT ON public.connectors TO authenticated;
GRANT SELECT ON public.connector_secrets TO authenticated;
GRANT SELECT ON public.connector_pairs TO authenticated;
GRANT SELECT ON public.entity_links TO authenticated;
GRANT SELECT ON public.webhook_deliveries TO authenticated;
GRANT SELECT ON public.sync_jobs TO authenticated;
GRANT SELECT ON public.sync_logs TO authenticated;
GRANT SELECT ON public.dead_letter_jobs TO authenticated;
GRANT SELECT ON public.suppression_window TO authenticated;
GRANT SELECT ON public.content_hashes TO authenticated;
