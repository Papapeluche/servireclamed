create table public.export_templates (
  id uuid primary key default gen_random_uuid(),
  ars_id uuid references public.ars_catalog(id),
  nombre text not null,
  tipo text not null default 'relacion' check (tipo in ('relacion', 'hoja_presentacion')),
  -- Cada elemento: { "field": "doctor_nombre", "label": "Médico" }
  header_fields jsonb not null default '[]'::jsonb,
  table_columns jsonb not null default '[]'::jsonb,
  total_field text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.export_templates enable row level security;

create policy "export_templates: staff autenticado acceso total"
  on public.export_templates for all
  to authenticated
  using (true)
  with check (true);

alter table public.relaciones
  add column template_id uuid references public.export_templates(id);
