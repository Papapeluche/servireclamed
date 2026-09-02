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

  const { nombre, cedula, rnc, telefono, especialidad, centro_medico, codigos } = await request.json();

  if (!nombre?.trim()) {
    return NextResponse.json({ error: "Falta el nombre del médico" }, { status: 400 });
  }

  const { data: doctor, error } = await supabase
    .from("doctors")
    .insert({
      nombre: nombre.trim(),
      cedula: cedula?.trim() || null,
      rnc: rnc?.trim() || null,
      telefono: telefono?.trim() || null,
      especialidad: especialidad?.trim() || null,
      centro_medico: centro_medico?.trim() || null,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (Array.isArray(codigos) && codigos.length > 0) {
    const rows = codigos
      .filter((c) => c.ars_id && c.codigo)
      .map((c) => ({ doctor_id: doctor.id, ars_id: c.ars_id, codigo: c.codigo }));
    if (rows.length > 0) {
      const { error: codigosError } = await supabase.from("doctor_ars_codigos").insert(rows);
      if (codigosError) {
        return NextResponse.json({ error: codigosError.message }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ id: doctor.id });
}
