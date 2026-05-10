-- Rollback for 20260510142548_oauth_states (local dev only)
DROP POLICY IF EXISTS oauth_states_delete ON public.oauth_states;
DROP POLICY IF EXISTS oauth_states_insert ON public.oauth_states;
DROP POLICY IF EXISTS oauth_states_select ON public.oauth_states;

ALTER TABLE public.oauth_states DISABLE ROW LEVEL SECURITY;

DROP TABLE IF EXISTS public.oauth_states;
