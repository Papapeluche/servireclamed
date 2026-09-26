-- Antes solo un admin podía borrar una reclamación (correcto para
-- proteger datos ya trabajados/facturados). Pero una foto tomada por error
-- al escanear (borrosa, duplicada, la persona se fotografió el pie en vez
-- del papel) no tiene ningún valor todavía si sigue "pendiente" o
-- "en_proceso" (no se ha marcado como revisada) — cualquier staff debería
-- poder borrar ESAS sin tener que pedirle a un admin. Las políticas RLS
-- de DELETE son permisivas (se OR-ean), así que esto se suma a la
-- restricción de admin que ya existía, sin reemplazarla.
create policy "claims: staff puede borrar las que sigan sin revisar" on public.claims
  for delete using (status in ('pendiente', 'en_proceso'));
