import { createClient } from "@supabase/supabase-js";

// Cliente con la llave de servicio — SOLO para usarse en rutas API del
// servidor (nunca en un componente cliente), para operaciones que la app
// normal no puede hacer con la llave anónima: crear usuarios de Auth,
// resetear contraseñas, etc. Requiere la variable de entorno
// SUPABASE_SERVICE_ROLE_KEY (privada, nunca con prefijo NEXT_PUBLIC_).
export function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
