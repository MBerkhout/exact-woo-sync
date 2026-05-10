-- Temporary OAuth CSRF state (Exact Online Phase 3).
CREATE TABLE public.oauth_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  state text NOT NULL,
  connector_id uuid NOT NULL,
  region text NOT NULL,
  env text NOT NULL CHECK (env IN ('production', 'sandbox')),
  created_at timestamptz NOT NULL DEFAULT now (),
  expires_at timestamptz NOT NULL,
  CONSTRAINT oauth_states_connector_tenant FOREIGN KEY (tenant_id, connector_id)
    REFERENCES public.connectors (tenant_id, id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX oauth_states_state_key ON public.oauth_states (state);

CREATE INDEX oauth_states_expires_at_idx ON public.oauth_states (expires_at);

ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY oauth_states_select ON public.oauth_states FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1
    FROM public.tenant_members tm
    WHERE tm.tenant_id = oauth_states.tenant_id
      AND tm.user_id = auth.uid ()
      AND tm.role = 'admin'
  )
);

CREATE POLICY oauth_states_insert ON public.oauth_states FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.tenant_members tm
    WHERE tm.tenant_id = oauth_states.tenant_id
      AND tm.user_id = auth.uid ()
      AND tm.role = 'admin'
  )
);

CREATE POLICY oauth_states_delete ON public.oauth_states FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT 1
    FROM public.tenant_members tm
    WHERE tm.tenant_id = oauth_states.tenant_id
      AND tm.user_id = auth.uid ()
      AND tm.role = 'admin'
  )
);

GRANT SELECT, INSERT, DELETE ON public.oauth_states TO authenticated;
