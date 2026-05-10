-- Tenants and memberships (§3 domain model).
CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TYPE public.tenant_role AS ENUM ('admin', 'viewer');

CREATE TABLE public.tenant_members (
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  role public.tenant_role NOT NULL DEFAULT 'viewer',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, user_id)
);

CREATE TABLE public.tenant_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.tenant_role NOT NULL DEFAULT 'viewer',
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.connectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  kind text NOT NULL,
  name text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  secrets_ref text,
  version text NOT NULL DEFAULT '0.0.0',
  status text NOT NULL DEFAULT 'inactive',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, id)
);

CREATE UNIQUE INDEX connectors_tenant_kind_name_idx
  ON public.connectors (tenant_id, lower(name));

CREATE TABLE public.connector_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  connector_id uuid NOT NULL UNIQUE REFERENCES public.connectors (id) ON DELETE CASCADE,
  ciphertext bytea NOT NULL,
  nonce bytea NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.connector_pairs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  source_connector_id uuid NOT NULL REFERENCES public.connectors (id) ON DELETE CASCADE,
  target_connector_id uuid NOT NULL REFERENCES public.connectors (id) ON DELETE CASCADE,
  feature_toggles jsonb NOT NULL DEFAULT '{}'::jsonb,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT connector_pairs_distinct CHECK (
    source_connector_id <> target_connector_id
  ),
  CONSTRAINT connector_pairs_source_tenant FOREIGN KEY (tenant_id, source_connector_id)
    REFERENCES public.connectors (tenant_id, id),
  CONSTRAINT connector_pairs_target_tenant FOREIGN KEY (tenant_id, target_connector_id)
    REFERENCES public.connectors (tenant_id, id)
);

CREATE UNIQUE INDEX connector_pairs_unique_route_idx
  ON public.connector_pairs (tenant_id, source_connector_id, target_connector_id);

ALTER TABLE public.connector_pairs
  ADD CONSTRAINT connector_pairs_tenant_id_unique UNIQUE (tenant_id, id);

CREATE TABLE public.entity_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  pair_id uuid NOT NULL REFERENCES public.connector_pairs (id) ON DELETE CASCADE,
  entity_kind text NOT NULL,
  source_id text NOT NULL,
  target_id text NOT NULL,
  match_key text,
  linked_at timestamptz NOT NULL DEFAULT now(),
  linked_by uuid REFERENCES auth.users (id),
  CONSTRAINT entity_links_pair_tenant FOREIGN KEY (tenant_id, pair_id)
    REFERENCES public.connector_pairs (tenant_id, id)
);

CREATE INDEX entity_links_pair_kind_idx ON public.entity_links (pair_id, entity_kind);

CREATE TABLE public.webhook_deliveries (
  connector_id uuid NOT NULL REFERENCES public.connectors (id) ON DELETE CASCADE,
  delivery_id text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (connector_id, delivery_id)
);

CREATE TABLE public.sync_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  pair_id uuid REFERENCES public.connector_pairs (id) ON DELETE SET NULL,
  kind text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  attempts integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  next_attempt_at timestamptz,
  last_error jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sync_jobs_pair_tenant FOREIGN KEY (tenant_id, pair_id)
    REFERENCES public.connector_pairs (tenant_id, id)
);

CREATE INDEX sync_jobs_tenant_status_idx ON public.sync_jobs (tenant_id, status);

CREATE TABLE public.sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  pair_id uuid REFERENCES public.connector_pairs (id) ON DELETE SET NULL,
  connector_id uuid REFERENCES public.connectors (id) ON DELETE SET NULL,
  direction text NOT NULL,
  entity_kind text,
  entity_id text,
  status text NOT NULL,
  http_status integer,
  duration_ms integer,
  redacted_payload jsonb,
  error jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  CONSTRAINT sync_logs_pair_tenant FOREIGN KEY (tenant_id, pair_id)
    REFERENCES public.connector_pairs (tenant_id, id),
  CONSTRAINT sync_logs_connector_tenant FOREIGN KEY (tenant_id, connector_id)
    REFERENCES public.connectors (tenant_id, id)
);

CREATE INDEX sync_logs_tenant_created_idx ON public.sync_logs (tenant_id, created_at DESC);
CREATE INDEX sync_logs_expires_idx ON public.sync_logs (expires_at);

CREATE TABLE public.dead_letter_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  pair_id uuid REFERENCES public.connector_pairs (id) ON DELETE SET NULL,
  original_job jsonb NOT NULL,
  last_error jsonb,
  dead_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dead_letter_pair_tenant FOREIGN KEY (tenant_id, pair_id)
    REFERENCES public.connector_pairs (tenant_id, id)
);

CREATE TABLE public.suppression_window (
  connector_id uuid NOT NULL REFERENCES public.connectors (id) ON DELETE CASCADE,
  entity_kind text NOT NULL,
  entity_id text NOT NULL,
  until timestamptz NOT NULL,
  PRIMARY KEY (connector_id, entity_kind, entity_id)
);

CREATE TABLE public.content_hashes (
  connector_id uuid NOT NULL REFERENCES public.connectors (id) ON DELETE CASCADE,
  entity_kind text NOT NULL,
  entity_id text NOT NULL,
  hash text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (connector_id, entity_kind, entity_id)
);
