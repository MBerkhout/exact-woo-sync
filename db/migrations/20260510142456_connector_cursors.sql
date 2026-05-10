-- Polling cursors for connector delta sync (Woo modified_after, Phase 4 scheduler).
CREATE TABLE public.connector_cursors (
  connector_id uuid PRIMARY KEY REFERENCES public.connectors (id) ON DELETE CASCADE,
  entity_kind text NOT NULL,
  cursor text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX entity_links_pair_kind_source_idx
  ON public.entity_links (pair_id, entity_kind, source_id);

ALTER TABLE public.connector_cursors ENABLE ROW LEVEL SECURITY;

CREATE POLICY connector_cursors_select ON public.connector_cursors FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1
    FROM public.connectors c
    INNER JOIN public.tenant_members tm ON tm.tenant_id = c.tenant_id
    WHERE c.id = connector_cursors.connector_id AND tm.user_id = auth.uid ()
  )
);

GRANT SELECT ON public.connector_cursors TO authenticated;
