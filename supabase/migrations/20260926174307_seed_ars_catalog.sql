insert into public.ars_catalog (nombre) values
  ('ARS Humano'),
  ('ARS Palic'),
  ('ARS Universal'),
  ('ARS Futuro'),
  ('ARS Senasa'),
  ('ARS Monumental'),
  ('ARS Meta Salud'),
  ('ARS Simag')
on conflict (nombre) do nothing;
