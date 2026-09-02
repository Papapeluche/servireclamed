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
