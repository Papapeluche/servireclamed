import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { ars_id, codigo } = await request.json();

  if (!ars_id || !codigo?.trim()) {
    return NextResponse.json({ error: "Falta la ARS o el código" }, { status: 400 });
  }

  const { error } = await supabase
    .from("doctor_ars_codigos")
    .upsert({ doctor_id: id, ars_id, codigo: codigo.trim() }, { onConflict: "doctor_id,ars_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { ars_id } = await request.json();

  if (!ars_id) {
    return NextResponse.json({ error: "Falta la ARS" }, { status: 400 });
  }

  const { error } = await supabase
    .from("doctor_ars_codigos")
    .delete()
    .eq("doctor_id", id)
    .eq("ars_id", ars_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
