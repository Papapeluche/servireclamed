-- Anexos de una reclamación: las hojas extra que acompañan a la mayoría de
-- los procedimientos (3 a 6 típicamente). Van en el mismo bucket de fotos,
-- bajo anexos/<claim_id>/, y se ordenan por cuándo se tomaron.
create table public.claim_anexos (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims(id) on delete cascade,
  image_path text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index claim_anexos_claim_idx on public.claim_anexos (claim_id, created_at);

alter table public.claim_anexos enable row level security;

create policy "claim_anexos: lectura para staff" on public.claim_anexos
  for select to authenticated using (true);
create policy "claim_anexos: agregar para staff" on public.claim_anexos
  for insert to authenticated with check (true);
-- Quitar un anexo no cambia montos ni totales, así que cualquier staff puede
-- mientras la reclamación no se haya enviado; un admin siempre.
create policy "claim_anexos: quitar para staff" on public.claim_anexos
  for delete to authenticated using (
    current_user_role() = 'admin'
    or exists (select 1 from public.claims c where c.id = claim_id and c.status in ('pendiente', 'en_proceso', 'revisado', 'en_relacion'))
  );

revoke all on public.claim_anexos from anon;
grant select, insert, delete on public.claim_anexos to authenticated;
