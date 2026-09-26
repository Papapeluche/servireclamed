-- Registro de auditoría: pensado para ser "inviolable" en el sentido real
-- (no solo "no hay botón para borrarlo en la UI"). Reglas:
--   1. No existe NINGUNA política RLS de INSERT/UPDATE/DELETE para
--      authenticated/anon — así que ni un admin puede editar o borrar una
--      fila ya escrita a través de la app (ni por error ni a propósito).
--   2. La única forma de escribir es la función log_audit_event(), que es
--      SECURITY DEFINER: ella decide el actor (auth.uid()) internamente,
--      así que nadie puede insertar una fila pretendiendo ser otro usuario.
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_id uuid references auth.users(id),
  actor_name text,
  action text not null,
  target_type text,
  target_id uuid,
  details jsonb
);

create index audit_log_created_at_idx on public.audit_log (created_at desc);

alter table public.audit_log enable row level security;

-- Solo admin/supervisor pueden CONSULTAR el historial (un digitador no
-- necesita ver quién anuló qué comprobante). Adrede no hay política de
-- insert/update/delete: eso bloquea esas operaciones por completo vía RLS
-- para cualquier rol, incluido admin.
create policy "audit_log: admin y supervisor pueden leer" on public.audit_log
  for select using (current_user_role() in ('admin', 'supervisor'));

create or replace function public.log_audit_event(
  p_action text,
  p_target_type text default null,
  p_target_id uuid default null,
  p_details jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  select coalesce(full_name, email) into v_name from public.profiles where id = auth.uid();
  insert into public.audit_log (actor_id, actor_name, action, target_type, target_id, details)
  values (auth.uid(), v_name, p_action, p_target_type, p_target_id, p_details);
end;
$$;

grant execute on function public.log_audit_event to authenticated;
