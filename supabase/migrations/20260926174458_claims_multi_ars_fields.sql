alter table public.claims
  add column sexo text,
  add column correo_electronico text,
  add column ciudad text,
  add column naf text,
  add column tipo_plan text,
  add column titular_o_dependiente text,
  add column valor_total numeric(12,2),
  add column total_dias integer,
  add column no_procede text;
