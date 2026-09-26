create table public.comprobantes (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  numero text not null unique,
  estado text not null default 'disponible' check (estado in ('disponible', 'usado', 'anulado')),
  ars_id uuid references public.ars_catalog(id),
  monto numeric(12,2),
  relacion_id uuid references public.relaciones(id),
  used_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index comprobantes_doctor_estado_idx on public.comprobantes (doctor_id, estado);

alter table public.comprobantes enable row level security;

create policy "comprobantes: staff autenticado acceso total"
  on public.comprobantes for all
  to authenticated
  using (true)
  with check (true);
