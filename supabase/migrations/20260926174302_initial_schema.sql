-- Perfiles de usuarios del staff (digitadores, supervisores)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null default 'digitador' check (role in ('digitador', 'supervisor', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: staff autenticado puede ver todo"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles: usuario puede actualizar su propio perfil"
  on public.profiles for update
  to authenticated
  using (id = auth.uid());

-- Catálogo de ARS
create table public.ars_catalog (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  codigo text,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.ars_catalog enable row level security;

create policy "ars_catalog: staff autenticado lectura"
  on public.ars_catalog for select
  to authenticated
  using (true);

create policy "ars_catalog: staff autenticado escritura"
  on public.ars_catalog for all
  to authenticated
  using (true)
  with check (true);

-- Reclamaciones médicas digitizadas
create table public.claims (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pendiente'
    check (status in ('pendiente', 'en_proceso', 'revisado', 'en_relacion', 'enviado', 'rechazado')),
  image_path text not null,

  ars_id uuid references public.ars_catalog(id),

  afiliado_nombre text,
  afiliado_cedula text,
  afiliado_no_afiliado text,

  paciente_nombre text,
  paciente_cedula text,
  parentesco text,

  doctor_nombre text,
  doctor_codigo text,

  fecha_servicio date,
  codigo_servicio text,
  descripcion_servicio text,

  diagnostico_codigo text,
  diagnostico_descripcion text,

  no_factura text,
  monto_reclamado numeric(12,2),
  moneda text not null default 'DOP',

  observaciones text,
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

-- Relaciones (lotes consolidados que se entregan/suben a cada ARS)
create table public.relaciones (
  id uuid primary key default gen_random_uuid(),
  ars_id uuid references public.ars_catalog(id),
  fecha date not null default current_date,
  estado text not null default 'borrador' check (estado in ('borrador', 'generada', 'entregada')),
  total_monto numeric(12,2) not null default 0,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.relaciones enable row level security;

create policy "relaciones: staff autenticado acceso total"
  on public.relaciones for all
  to authenticated
  using (true)
  with check (true);

-- Tabla puente reclamaciones <-> relación
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

-- updated_at automático en claims
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger claims_set_updated_at
  before update on public.claims
  for each row execute function public.set_updated_at();
