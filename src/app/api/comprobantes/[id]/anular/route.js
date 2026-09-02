import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/auth";

export async function POST(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("comprobantes")
    .update({ estado: "anulado" })
    .eq("id", id)
    .eq("estado", "disponible")
    .select("id, numero");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data || data.length === 0) {
    return NextResponse.json(
      { error: "Ese comprobante ya no está disponible, o no tienes permiso para anularlo." },
      { status: 409 }
    );
  }

  await logAudit(supabase, {
    action: "COMPROBANTE_ANULADO",
    targetType: "comprobante",
    targetId: id,
    details: { numero: data[0].numero },
  });

  return NextResponse.json({ ok: true });
}
