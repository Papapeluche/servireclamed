import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile, isAdmin, logAudit } from "@/lib/auth";

export async function POST(request) {
  const supabase = await createClient();

  const me = await getCurrentProfile(supabase);
  if (!isAdmin(me)) {
    return NextResponse.json({ error: "Solo un admin puede crear usuarios." }, { status: 403 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      {
        error:
          "Falta configurar SUPABASE_SERVICE_ROLE_KEY en el servidor — sin eso la app no puede crear cuentas nuevas. Mientras tanto, créala desde el dashboard de Supabase (Authentication → Users → Add user).",
      },
      { status: 501 }
    );
  }

  const { email, password, full_name, role } = await request.json();

  if (!email?.trim() || !password || password.length < 8) {
    return NextResponse.json(
      { error: "Falta el correo, o la contraseña debe tener al menos 8 caracteres." },
      { status: 400 }
    );
  }

  const { data: created, error } = await admin.auth.admin.createUser({
    email: email.trim(),
    password,
    email_confirm: true,
    user_metadata: full_name?.trim() ? { full_name: full_name.trim() } : undefined,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // handle_new_user() ya le crea su fila en profiles con rol "digitador" —
  // si se pidió otro rol desde el formulario, se sube aparte.
  if (role && role !== "digitador") {
    await supabase.from("profiles").update({ role }).eq("id", created.user.id);
  }

  await logAudit(supabase, {
    action: "USUARIO_CREADO",
    targetType: "profile",
    targetId: created.user.id,
    details: { email: email.trim(), rol: role || "digitador" },
  });

  return NextResponse.json({ id: created.user.id });
}
