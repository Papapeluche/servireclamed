import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request) {
  const supabase = await createClient();
  const arsId = request.nextUrl.searchParams.get("ars_id");

  let query = supabase
    .from("export_templates")
    .select("*, ars_catalog(nombre)")
    .order("created_at", { ascending: false });

  if (arsId) query = query.eq("ars_id", arsId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ templates: data });
}

export async function POST(request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await request.json();
  const { nombre, tipo, ars_id, header_fields, table_columns, total_field } = body;

  if (!nombre || !table_columns?.length) {
    return NextResponse.json(
      { error: "Falta el nombre o al menos una columna de tabla" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("export_templates")
    .insert({
      nombre,
      tipo: tipo || "relacion",
      ars_id: ars_id || null,
      header_fields: header_fields || [],
      table_columns,
      total_field: total_field || "monto",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
