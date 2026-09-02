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

  const { ars_id, doctor_nombre, doctor_codigo } = await request.json();
  if (!ars_id) {
    return NextResponse.json({ error: "Falta ars_id" }, { status: 400 });
  }

  let query = supabase
    .from("claims")
    .select(
      "id, monto, doctor_nombre, doctor_codigo, doctor_cedula, especialidad, centro_medico, telefono_medico"
    )
    .eq("ars_id", ars_id)
    .eq("status", "revisado");

  query = doctor_nombre ? query.eq("doctor_nombre", doctor_nombre) : query.is("doctor_nombre", null);
  query = doctor_codigo ? query.eq("doctor_codigo", doctor_codigo) : query.is("doctor_codigo", null);

  const { data: claims, error: claimsError } = await query;

  if (claimsError) {
    return NextResponse.json({ error: claimsError.message }, { status: 500 });
  }

  if (!claims || claims.length === 0) {
    return NextResponse.json(
      { error: "No hay reclamaciones revisadas pendientes para este médico/ARS" },
      { status: 400 }
    );
  }

  const totalMonto = claims.reduce((sum, c) => sum + Number(c.monto || 0), 0);
  const first = claims[0];

  const { data: relacion, error: relacionError } = await supabase
    .from("relaciones")
    .insert({
      ars_id,
      total_monto: totalMonto,
      created_by: user.id,
      estado: "generada",
      doctor_nombre: first.doctor_nombre,
      doctor_codigo: first.doctor_codigo,
      doctor_cedula: first.doctor_cedula,
      especialidad: first.especialidad,
      centro_medico: first.centro_medico,
      telefono_medico: first.telefono_medico,
    })
    .select("id")
    .single();

  if (relacionError) {
    return NextResponse.json({ error: relacionError.message }, { status: 500 });
  }

  const relacionClaims = claims.map((c, idx) => ({
    relacion_id: relacion.id,
    claim_id: c.id,
    orden: idx,
  }));

  const { error: bridgeError } = await supabase.from("relacion_claims").insert(relacionClaims);
  if (bridgeError) {
    return NextResponse.json({ error: bridgeError.message }, { status: 500 });
  }

  const { error: updateError } = await supabase
    .from("claims")
    .update({ status: "en_relacion" })
    .in(
      "id",
      claims.map((c) => c.id)
    );

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ id: relacion.id });
}
