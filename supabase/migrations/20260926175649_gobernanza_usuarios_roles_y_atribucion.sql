-- Atribución: separar "quién capturó la foto" de "quién la transcribió",
-- hoy se pisaban entre sí porque ambos escribían digitized_by.
alter table public.claims add column captured_by uuid references auth.users(id);

-- profiles necesita el email para poder mostrar una lista de usuarios
-- gestionable sin depender de la API admin de Supabase (que requiere
-- service role, que esta app no usa).
alter table public.profiles add column email text;
update public.profiles p set email = u.email from auth.users u where p.id = u.id and p.email is null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  insert into public.profiles (id, full_name, role, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    'digitador',
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$function$;

-- Rol del usuario actual, para usar en políticas RLS sin repetir el select.
create or replace function public.current_user_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- FALLO DE SEGURIDAD REAL: la política de UPDATE de profiles solo exigía
-- id = auth.uid(), así que cualquier usuario autenticado podía cambiar su
-- propia columna role a 'admin' sin que nadie lo autorizara. Se bloquea con
-- un trigger: cambiar el rol de una fila (la propia o la de otro) solo lo
-- puede hacer alguien que YA es admin.
create or replace function public.prevent_role_self_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.role is distinct from OLD.role and coalesce(public.current_user_role(), '') <> 'admin' then
    raise exception 'Solo un admin puede cambiar roles.';
  end if;
  return NEW;
end;
$$;

drop trigger if exists profiles_prevent_role_self_escalation on public.profiles;
create trigger profiles_prevent_role_self_escalation
before update on public.profiles
for each row
execute function public.prevent_role_self_escalation();

-- La política existente solo dejaba a cada quien actualizar SU PROPIA fila
-- (id = auth.uid()), así que un admin no podía cambiar el rol de otro
-- usuario ni siquiera pasando el trigger de arriba. Se agrega una política
-- adicional para que un admin pueda actualizar cualquier perfil.
create policy "profiles: admin puede actualizar cualquier perfil"
on public.profiles for update
using (current_user_role() = 'admin');

-- doctors: separar DELETE (acción irreversible y poco frecuente) del resto.
drop policy if exists "doctors: staff autenticado acceso total" on public.doctors;
create policy "doctors: lectura para staff" on public.doctors for select using (true);
create policy "doctors: crear para staff" on public.doctors for insert with check (true);
create policy "doctors: actualizar para staff" on public.doctors for update using (true) with check (true);
create policy "doctors: eliminar solo admin" on public.doctors for delete using (current_user_role() = 'admin');

-- export_templates: son el formato de entrega a las ARS, estructural y
-- poco frecuente de tocar — solo admin lo crea/edita/borra, todos lo leen
-- (todos generan relaciones/hojas usando el formato ya guardado).
drop policy if exists "export_templates: staff autenticado acceso total" on public.export_templates;
create policy "export_templates: lectura para staff" on public.export_templates for select using (true);
create policy "export_templates: escritura solo admin" on public.export_templates for all
  using (current_user_role() = 'admin') with check (current_user_role() = 'admin');

-- ars_catalog: mismo criterio (catálogo estructural).
drop policy if exists "ars_catalog: staff autenticado escritura" on public.ars_catalog;
create policy "ars_catalog: escritura solo admin" on public.ars_catalog for all
  using (current_user_role() = 'admin') with check (current_user_role() = 'admin');

-- comprobantes: asignar un rango de NCF nuevo o eliminarlo es una acción
-- contable sensible (admin/supervisor); marcar uno como "usado" al generar
-- una hoja de presentación es trabajo normal de cualquier digitador y debe
-- seguir funcionando para todos (por eso UPDATE se queda abierto en RLS).
-- Anular uno sí es sensible, así que eso se controla aparte con un trigger
-- que revisa la transición específica.
drop policy if exists "comprobantes: staff autenticado acceso total" on public.comprobantes;
create policy "comprobantes: lectura para staff" on public.comprobantes for select using (true);
create policy "comprobantes: actualizar para staff" on public.comprobantes for update using (true) with check (true);
create policy "comprobantes: crear solo admin o supervisor" on public.comprobantes for insert
  with check (current_user_role() in ('admin', 'supervisor'));
create policy "comprobantes: eliminar solo admin" on public.comprobantes for delete
  using (current_user_role() = 'admin');

create or replace function public.prevent_unauthorized_anulacion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.estado = 'anulado' and OLD.estado is distinct from 'anulado'
     and coalesce(public.current_user_role(), '') not in ('admin', 'supervisor') then
    raise exception 'Solo un admin o supervisor puede anular un comprobante.';
  end if;
  return NEW;
end;
$$;

drop trigger if exists comprobantes_prevent_unauthorized_anulacion on public.comprobantes;
create trigger comprobantes_prevent_unauthorized_anulacion
before update on public.comprobantes
for each row
execute function public.prevent_unauthorized_anulacion();
