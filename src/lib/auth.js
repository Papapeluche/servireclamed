// Perfil (con rol) del usuario autenticado en la sesión actual del servidor.
// `supabase` debe venir de src/lib/supabase/server.js (createClient()).
export async function getCurrentProfile(supabase) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("id", user.id)
    .single();

  return profile;
}

export function isAdmin(profile) {
  return profile?.role === "admin";
}

export function isSupervisorOrAdmin(profile) {
  return profile?.role === "admin" || profile?.role === "supervisor";
}

// Mapa id -> nombre visible, para mostrar "digitado por / creado por" sin
// tener que resolver el FK de cada tabla contra profiles uno por uno.
export async function getProfilesMap(supabase) {
  const { data } = await supabase.from("profiles").select("id, full_name, email");
  const map = {};
  for (const p of data || []) {
    map[p.id] = p.full_name || p.email || p.id;
  }
  return map;
}

// Escribe una fila en audit_log a través de la función de base de datos
// (nunca insertando directo a la tabla). El actor lo resuelve la función
// desde auth.uid() del lado del servidor, no algo que mande el caller —
// así no se puede falsificar quién hizo la acción. No lanza si falla: un
// error de auditoría no debe tumbar la acción real que se estaba logueando.
export async function logAudit(supabase, { action, targetType = null, targetId = null, details = null }) {
  try {
    await supabase.rpc("log_audit_event", {
      p_action: action,
      p_target_type: targetType,
      p_target_id: targetId,
      p_details: details,
    });
  } catch {
    // silencioso a propósito — ver comentario arriba
  }
}
