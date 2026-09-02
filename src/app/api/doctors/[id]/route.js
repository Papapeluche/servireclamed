import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const body = await request.json();

  const allowed = ["nombre", "cedula", "rnc", "telefono", "especialidad", "centro_medico"];
  const payload = {};
  for (const key of allowed) {
    if (key in body) payload[key] = body[key]?.trim ? body[key].trim() || null : body[key];
  }

  const { error } = await supabase.from("doctors").update(payload).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { error } = await supabase.from("doctors").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
