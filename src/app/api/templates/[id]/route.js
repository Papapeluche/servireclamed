import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const body = await request.json();

  const allowed = [
    "nombre",
    "tipo",
    "ars_id",
    "header_fields",
    "table_columns",
    "total_field",
    "categorias",
  ];
  const payload = {};
  for (const key of allowed) {
    if (key in body) payload[key] = body[key];
  }

  // Con RLS, un UPDATE/DELETE sin permiso no da error: simplemente no
  // afecta filas. Hay que pedir la fila de vuelta para distinguir "no
  // tenías permiso" de "sí se guardó".
  const { data, error } = await supabase
    .from("export_templates")
    .update(payload)
    .eq("id", id)
    .select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data || data.length === 0) {
    return NextResponse.json(
      { error: "No tienes permiso para editar formatos (solo un admin puede)." },
      { status: 403 }
    );
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.from("export_templates").delete().eq("id", id).select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data || data.length === 0) {
    return NextResponse.json(
      { error: "No tienes permiso para eliminar formatos (solo un admin puede)." },
      { status: 403 }
    );
  }
  return NextResponse.json({ ok: true });
}
