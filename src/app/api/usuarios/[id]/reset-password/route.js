import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile, isAdmin, logAudit } from "@/lib/auth";

export async function POST(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();

  const me = await getCurrentProfile(supabase);
  if (!isAdmin(me)) {
    return NextResponse.json({ error: "Solo un admin puede resetear contraseñas." }, { status: 403 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Falta configurar SUPABASE_SERVICE_ROLE_KEY en el servidor para poder hacer esto." },
      { status: 501 }
    );
  }

  const { password } = await request.json();
  if (!password || password.length < 8) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres." }, { status: 400 });
  }

  const { error } = await admin.auth.admin.updateUserById(id, { password });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logAudit(supabase, {
    action: "USUARIO_CONTRASENA_RESETEADA",
    targetType: "profile",
    targetId: id,
  });

  return NextResponse.json({ ok: true });
}
