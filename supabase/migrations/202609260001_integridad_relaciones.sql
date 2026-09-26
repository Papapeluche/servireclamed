-- Aplicar en Supabase antes de desplegar el código que llama estas funciones.
alter table public.claims add column if not exists edit_version bigint not null default 0;

create or replace function public.bump_claim_edit_version()
returns trigger language plpgsql as $$
begin
  new.edit_version := old.edit_version + 1;
  return new;
end;
$$;
drop trigger if exists claims_bump_edit_version on public.claims;
create trigger claims_bump_edit_version before update on public.claims
for each row execute function public.bump_claim_edit_version();

-- Locks + inserción + enlaces + estado se confirman juntos o se revierten juntos.
create or replace function public.crear_relacion_atomica(
  p_ars_id uuid, p_doctor_id uuid, p_doctor_nombre text,
  p_doctor_codigo text, p_template_id uuid, p_total_field text default 'monto'
) returns uuid language plpgsql security invoker set search_path = public as $$
declare
  v_claims public.claims[];
  v_first public.claims%rowtype;
  v_relacion_id uuid;
  v_total numeric;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  -- El editor de plantillas permite totalizar cualquier columna numérica
  -- (monto, valor_total, a_pagar_por_afiliado...), no solo monto.
  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'claims'
                   and column_name = p_total_field
                   and data_type in ('numeric', 'integer', 'bigint', 'smallint', 'real', 'double precision')) then
    raise exception 'Campo de total no permitido: %', p_total_field;
  end if;

  select array_agg(c order by c.created_at, c.id) into v_claims
  from (select * from public.claims
        where ars_id = p_ars_id and status = 'revisado'
        and ((p_doctor_id is not null and doctor_id = p_doctor_id)
          or (p_doctor_id is null
            and doctor_nombre is not distinct from p_doctor_nombre
            and doctor_codigo is not distinct from p_doctor_codigo))
        order by created_at, id for update) c;
  if coalesce(array_length(v_claims, 1), 0) = 0 then
    raise exception 'No hay reclamaciones revisadas para este médico y ARS';
  end if;
  v_first := v_claims[1];
  select coalesce(sum(coalesce((to_jsonb(c)->>p_total_field)::numeric, 0)), 0)
    into v_total from unnest(v_claims) c;

  insert into public.relaciones (ars_id, total_monto, created_by, estado, template_id,
    doctor_id, doctor_nombre, doctor_codigo, doctor_cedula, doctor_rnc,
    especialidad, centro_medico, telefono_medico)
  values (p_ars_id, v_total, auth.uid(), 'generada', p_template_id,
    v_first.doctor_id, v_first.doctor_nombre, v_first.doctor_codigo,
    v_first.doctor_cedula, v_first.doctor_rnc, v_first.especialidad,
    v_first.centro_medico, v_first.telefono_medico)
  returning id into v_relacion_id;

  insert into public.relacion_claims (relacion_id, claim_id, orden)
  select v_relacion_id, t.id, t.ordinality - 1 from unnest(v_claims) with ordinality as t;
  update public.claims set status = 'en_relacion'
  where id in (select c.id from unnest(v_claims) c);
  if (select count(*) from public.claims where id in (select c.id from unnest(v_claims) c)
      and status = 'en_relacion') <> array_length(v_claims, 1) then
    raise exception 'No se pudieron actualizar todas las reclamaciones';
  end if;
  return v_relacion_id;
end;
$$;
revoke all on function public.crear_relacion_atomica(uuid, uuid, text, text, uuid, text) from public, anon;
grant execute on function public.crear_relacion_atomica(uuid, uuid, text, text, uuid, text) to authenticated;

-- Una sola actualización condicional consume el NCF; valida pertenencia
-- al médico y fecha de vencimiento. El lock de la fila serializa competidores.
create or replace function public.consumir_comprobante(
  p_relacion_id uuid, p_comprobante_id uuid
) returns text language plpgsql security invoker set search_path = public as $$
declare
  v_relacion public.relaciones%rowtype;
  v_numero text;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  select * into v_relacion from public.relaciones where id = p_relacion_id for update;
  if not found or v_relacion.doctor_id is null then raise exception 'Relación o médico no encontrado'; end if;
  if exists (select 1 from public.comprobantes where relacion_id = p_relacion_id and estado = 'usado') then
    raise exception 'Esta relación ya tiene un comprobante asignado';
  end if;
  update public.comprobantes
  set estado = 'usado', ars_id = v_relacion.ars_id, monto = v_relacion.total_monto,
      relacion_id = p_relacion_id, used_at = now()
  where id = p_comprobante_id and doctor_id = v_relacion.doctor_id
    and estado = 'disponible' and (vencimiento is null or vencimiento >= current_date)
  returning numero into v_numero;
  if v_numero is null then raise exception 'Comprobante no disponible, vencido o de otro médico'; end if;
  return v_numero;
end;
$$;
revoke all on function public.consumir_comprobante(uuid, uuid) from public, anon;
grant execute on function public.consumir_comprobante(uuid, uuid) to authenticated;
