drop table if exists public.relacion_claims;
drop table if exists public.claims;

create table public.claims (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pendiente'
    check (status in ('pendiente', 'en_proceso', 'revisado', 'en_relacion', 'enviado', 'rechazado')),
  image_path text not null,

  ars_id uuid references public.ars_catalog(id),

  -- Núcleo: presente en (casi) todas las ARS
  afiliado_nombre text,
  no_carnet_nss text,
  no_autorizacion text,
  fecha_servicio date,
  tipo_servicio text,
  monto numeric(12,2),

  -- Afiliado/paciente: visto en formulario ASEMAP/Amor y Paz
  paciente_cedula text,
  edad text,
  codigo_afiliado text,
  plan text,
  direccion text,
  telefono text,
  nombre_empleador text,
  telefono_empleador text,
  autorizado_por text,

  -- Clínico
  diagnostico text,
  procedimiento text,
  codigo_procedimiento text,
  fecha_ingreso date,
  fecha_alta date,
  no_habitacion text,
  a_pagar_por_afiliado numeric(12,2),

  -- Médico
  doctor_nombre text,
  doctor_codigo text,
  doctor_cedula text,
  especialidad text,
  centro_medico text,
  telefono_medico text,

  observaciones text,
  campos_adicionales jsonb not null default '{}'::jsonb,
  low_confidence_fields jsonb not null default '[]'::jsonb,

  digitized_by uuid references public.profiles(id),
  digitized_at timestamptz,
  verified_by uuid references public.profiles(id),
  verified_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index claims_status_idx on public.claims(status);
create index claims_ars_id_idx on public.claims(ars_id);

alter table public.claims enable row level security;

create policy "claims: staff autenticado acceso total"
  on public.claims for all
  to authenticated
  using (true)
  with check (true);

create trigger claims_set_updated_at
  before update on public.claims
  for each row execute function public.set_updated_at();

create table public.relacion_claims (
  relacion_id uuid not null references public.relaciones(id) on delete cascade,
  claim_id uuid not null references public.claims(id) on delete cascade,
  orden integer not null default 0,
  primary key (relacion_id, claim_id)
);

alter table public.relacion_claims enable row level security;

create policy "relacion_claims: staff autenticado acceso total"
  on public.relacion_claims for all
  to authenticated
  using (true)
  with check (true);
