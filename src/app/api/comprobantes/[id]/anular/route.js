import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();

  const { error } = await supabase
    .from("comprobantes")
    .update({ estado: "anulado" })
    .eq("id", id)
    .eq("estado", "disponible");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
