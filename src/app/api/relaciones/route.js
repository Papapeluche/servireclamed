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

  const { ars_id } = await request.json();
  if (!ars_id) {
    return NextResponse.json({ error: "Falta ars_id" }, { status: 400 });
  }

  const { data: claims, error: claimsError } = await supabase
    .from("claims")
    .select("id, monto_reclamado")
    .eq("ars_id", ars_id)
    .eq("status", "revisado");

  if (claimsError) {
    return NextResponse.json({ error: claimsError.message }, { status: 500 });
  }

  if (!claims || claims.length === 0) {
    return NextResponse.json(
      { error: "No hay reclamaciones revisadas pendientes para esta ARS" },
      { status: 400 }
    );
  }

  const totalMonto = claims.reduce((sum, c) => sum + Number(c.monto_reclamado || 0), 0);

  const { data: relacion, error: relacionError } = await supabase
    .from("relaciones")
    .insert({ ars_id, total_monto: totalMonto, created_by: user.id, estado: "generada" })
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
