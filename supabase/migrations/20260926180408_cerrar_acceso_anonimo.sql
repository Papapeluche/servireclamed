-- FALLO DE SEGURIDAD: las políticas creadas sin "to authenticated" aplican
-- al rol PUBLIC, que incluye a anon, y Supabase le da a anon todos los
-- privilegios de tabla por defecto. Con la llave anon (pública: va en el
-- navegador) cualquiera sin iniciar sesión podía leer reclamaciones con
-- datos médicos, crear/editar registros y borrar reclamaciones pendientes.
-- La app nunca usa anon para datos (todo pasa con sesión iniciada), así
-- que se le quita todo acceso y cada política queda solo para authenticated.

revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on functions from anon;

do $$
declare p record;
begin
  for p in select policyname, tablename from pg_policies
           where schemaname = 'public' and roles = '{public}'
  loop
    execute format('alter policy %I on public.%I to authenticated', p.policyname, p.tablename);
  end loop;
end $$;

-- Funciones: las de trigger no deben poder llamarse como RPC por nadie
-- (los triggers se disparan igual sin EXECUTE); las de uso real quedan
-- solo para usuarios con sesión.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.prevent_role_self_escalation() from public, anon, authenticated;
revoke execute on function public.prevent_unauthorized_anulacion() from public, anon, authenticated;
revoke execute on function public.bump_claim_edit_version() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

revoke execute on function public.current_user_role() from public, anon;
grant execute on function public.current_user_role() to authenticated;
revoke execute on function public.log_audit_event(text, text, uuid, jsonb) from public, anon;
grant execute on function public.log_audit_event(text, text, uuid, jsonb) to authenticated;

alter function public.set_updated_at() set search_path = public;
alter function public.bump_claim_edit_version() set search_path = public;
