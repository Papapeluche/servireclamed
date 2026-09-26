insert into public.ars_catalog (nombre) values
  ('ARS Amor y Paz'),
  ('ARS-UASD'),
  ('ARS Yunen'),
  ('ARS Reservas'),
  ('MAPFRE Salud ARS'),
  ('ARS Primera'),
  ('CMD')
on conflict (nombre) do nothing;

create table public.doctors (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  cedula text unique,
  telefono text,
  especialidad text,
  centro_medico text,
  created_at timestamptz not null default now()
);

create index doctors_nombre_idx on public.doctors (lower(nombre));

alter table public.doctors enable row level security;

create policy "doctors: staff autenticado acceso total"
  on public.doctors for all
  to authenticated
  using (true)
  with check (true);

-- El código de un médico ante una ARS es propio de esa ARS, no del médico
-- en general (visto en las listas de CMD, Senasa, etc.).
create table public.doctor_ars_codigos (
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  ars_id uuid not null references public.ars_catalog(id) on delete cascade,
  codigo text not null,
  primary key (doctor_id, ars_id)
);

alter table public.doctor_ars_codigos enable row level security;

create policy "doctor_ars_codigos: staff autenticado acceso total"
  on public.doctor_ars_codigos for all
  to authenticated
  using (true)
  with check (true);
