import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Lo llama el cron de Vercel una vez al día (ver vercel.json). En el plan
// gratis, Supabase PAUSA el proyecto tras 7 días sin actividad en la base, y
// la app queda caída (no se puede ni iniciar sesión) hasta restaurarlo a mano.
// Pasó el 2026-10-07. Una lectura mínima al día cuenta como actividad.
//
// Si CRON_SECRET está configurada en Vercel, Vercel la manda sola en la
// cabecera Authorization y aquí se exige. No devuelve ningún dato de la base.
export const dynamic = "force-dynamic";

export async function GET(request) {
  const secreto = process.env.CRON_SECRET;
  if (secreto && request.headers.get("authorization") !== `Bearer ${secreto}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) {
    // El detalle va al log de Vercel, no a la respuesta (la ruta es pública).
    console.error("keepalive: falta SUPABASE_SERVICE_ROLE_KEY");
    return NextResponse.json({ ok: false }, { status: 501 });
  }

  const { error } = await admin.from("ars_catalog").select("id", { head: true, count: "exact" });
  if (error) {
    console.error("keepalive: la base no respondió", error.message);
    return NextResponse.json({ ok: false }, { status: 502 });
  }
  return NextResponse.json({ ok: true, at: new Date().toISOString() });
}
