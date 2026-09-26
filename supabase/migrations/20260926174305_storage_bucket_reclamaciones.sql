insert into storage.buckets (id, name, public)
values ('reclamaciones-imagenes', 'reclamaciones-imagenes', false)
on conflict (id) do nothing;

create policy "reclamaciones-imagenes: staff autenticado lectura"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'reclamaciones-imagenes');

create policy "reclamaciones-imagenes: staff autenticado escritura"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'reclamaciones-imagenes');

create policy "reclamaciones-imagenes: staff autenticado borrado"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'reclamaciones-imagenes');
