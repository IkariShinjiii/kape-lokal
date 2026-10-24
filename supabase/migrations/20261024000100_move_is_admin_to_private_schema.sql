-- Applied to the kape-lokal Supabase project on 2026-10-24.
-- is_admin() is only used by row-level security policies. Keeping it in public
-- exposed it as /rest/v1/rpc/is_admin. The private schema is not exposed by the API,
-- and existing policies follow the function because they reference it by id.

create schema if not exists private;
grant usage on schema private to anon, authenticated;
alter function public.is_admin() set schema private;
