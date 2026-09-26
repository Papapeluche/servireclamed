-- Fase de IA: cuándo se llenó (o se intentó llenar) una reclamación
-- automáticamente, y si algo falló, para poder diagnosticar/reintentar.
-- low_confidence_fields ya existía y se reutiliza tal cual: antes lo
-- marcaba el digitador con "¿No se entiende?", ahora también lo puede
-- marcar la IA cuando no está segura de un campo — el mismo mecanismo de
-- aviso en ClaimEditor sirve para ambos casos sin tocar nada más.
alter table public.claims add column ai_procesado_at timestamptz;
alter table public.claims add column ai_error text;
