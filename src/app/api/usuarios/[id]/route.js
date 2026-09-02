import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, isAdmin, logAudit } from "@/lib/auth";

const VALID_ROLES = ["digitador", "supervisor", "admin"];

export async function PATCH(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();

  const me = await getCurrentProfile(supabase);
  if (!isAdmin(me)) {
    return NextResponse.json({ error: "Solo un admin puede editar usuarios." }, { status: 403 });
  }

  const { role, full_name } = await request.json();

  const payload = {};
  if (role !== undefined) {
    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: "Rol inválido." }, { status: 400 });
    }
    payload.role = role;
  }
  if (full_name !== undefined) {
    if (!full_name?.trim()) {
      return NextResponse.json({ error: "El nombre no puede quedar vacío." }, { status: 400 });
    }
    payload.full_name = full_name.trim();
  }
  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ error: "Nada que actualizar." }, { status: 400 });
  }

  const { data: before } = await supabase.from("profiles").select("role, full_name").eq("id", id).single();

  const { data, error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", id)
    .select("id, full_name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data || data.length === 0) {
    return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
  }

  if (payload.role && payload.role !== before?.role) {
    await logAudit(supabase, {
      action: "USUARIO_ROL_CAMBIADO",
      targetType: "profile",
      targetId: id,
      details: { usuario: data[0].full_name, de: before?.role, a: payload.role },
    });
  }
  if (payload.full_name && payload.full_name !== before?.full_name) {
    await logAudit(supabase, {
      action: "USUARIO_NOMBRE_EDITADO",
      targetType: "profile",
      targetId: id,
      details: { de: before?.full_name, a: payload.full_name },
    });
  }

  return NextResponse.json({ ok: true });
}
