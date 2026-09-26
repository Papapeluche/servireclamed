-- Auditoría (parte 2): claims y relaciones son literalmente los datos de
-- facturación del negocio, y hoy CUALQUIER staff autenticado puede
-- borrarlos directo (política ALL con qual=true) — no hay UI para hacerlo,
-- pero sí es alcanzable llamando a Supabase directo desde el navegador
-- (ClaimEditor ya usa el cliente de browser sin pasar por una ruta API).
-- Mismo criterio que ya se aplicó a doctors: separar DELETE del resto.
drop policy if exists "claims: staff autenticado acceso total" on public.claims;
create policy "claims: lectura para staff" on public.claims for select using (true);
create policy "claims: crear para staff" on public.claims for insert with check (true);
create policy "claims: actualizar para staff" on public.claims for update using (true) with check (true);
create policy "claims: eliminar solo admin" on public.claims for delete using (current_user_role() = 'admin');

drop policy if exists "relaciones: staff autenticado acceso total" on public.relaciones;
create policy "relaciones: lectura para staff" on public.relaciones for select using (true);
create policy "relaciones: crear para staff" on public.relaciones for insert with check (true);
create policy "relaciones: actualizar para staff" on public.relaciones for update using (true) with check (true);
create policy "relaciones: eliminar solo admin" on public.relaciones for delete using (current_user_role() = 'admin');

drop policy if exists "relacion_claims: staff autenticado acceso total" on public.relacion_claims;
create policy "relacion_claims: lectura para staff" on public.relacion_claims for select using (true);
create policy "relacion_claims: crear para staff" on public.relacion_claims for insert with check (true);
create policy "relacion_claims: actualizar para staff" on public.relacion_claims for update using (true) with check (true);
create policy "relacion_claims: eliminar solo admin" on public.relacion_claims for delete using (current_user_role() = 'admin');
