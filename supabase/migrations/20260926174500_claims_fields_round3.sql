alter table public.claims
  add column fecha_vencimiento_autorizacion date,
  add column origen_padecimiento text,
  add column pagar_a text,
  add column tipo_documento text,
  add column paciente_hospitalizado boolean;
