import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, isAdmin } from "@/lib/auth";

const VALID_ROLES = ["digitador", "supervisor", "admin"];

export async function PATCH(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();

  const me = await getCurrentProfile(supabase);
  if (!isAdmin(me)) {
    return NextResponse.json({ error: "Solo un admin puede cambiar roles." }, { status: 403 });
  }

  const { role } = await request.json();
  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: "Rol inválido." }, { status: 400 });
  }

  const { data, error } = await supabase.from("profiles").update({ role }).eq("id", id).select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data || data.length === 0) {
    return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
