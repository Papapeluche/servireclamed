alter table public.claims add column doctor_id uuid references public.doctors(id);
alter table public.relaciones add column doctor_id uuid references public.doctors(id);
alter table public.relaciones add column hoja_generada_at timestamptz;

create index claims_doctor_id_idx on public.claims (doctor_id);
create index relaciones_doctor_id_idx on public.relaciones (doctor_id);

-- Backfill de datos ya existentes, por cédula del médico (más confiable que
-- el nombre, que puede venir escrito distinto entre reclamaciones).
update public.claims c
set doctor_id = d.id
from public.doctors d
where c.doctor_id is null
  and c.doctor_cedula is not null
  and c.doctor_cedula = d.cedula;

update public.relaciones r
set doctor_id = d.id
from public.doctors d
where r.doctor_id is null
  and r.doctor_cedula is not null
  and r.doctor_cedula = d.cedula;
