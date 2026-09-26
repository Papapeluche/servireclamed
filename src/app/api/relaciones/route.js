import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { ars_id, doctor_id, doctor_nombre, doctor_codigo, template_id } = await request.json();
  if (!ars_id) {
    return NextResponse.json({ error: "Falta ars_id" }, { status: 400 });
  }

  let totalField = "monto";
  if (template_id) {
    const { data: template } = await supabase
      .from("export_templates")
      .select("total_field")
      .eq("id", template_id)
      .single();
    if (template?.total_field) totalField = template.total_field;
  }

  const { data: id, error } = await supabase.rpc("crear_relacion_atomica", {
    p_ars_id: ars_id,
    p_doctor_id: doctor_id || null,
    p_doctor_nombre: doctor_nombre || null,
    p_doctor_codigo: doctor_codigo || null,
    p_template_id: template_id || null,
    p_total_field: totalField,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 409 });
  return NextResponse.json({ id });
}
