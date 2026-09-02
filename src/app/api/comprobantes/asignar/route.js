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

  const { doctor_id, prefijo, numero_inicial, cantidad } = await request.json();

  const cantidadNum = Number(cantidad);
  const inicialNum = Number(numero_inicial);

  if (!doctor_id) {
    return NextResponse.json({ error: "Falta el médico" }, { status: 400 });
  }
  if (!Number.isInteger(inicialNum) || inicialNum < 0) {
    return NextResponse.json({ error: "Número inicial inválido" }, { status: 400 });
  }
  if (!Number.isInteger(cantidadNum) || cantidadNum < 1 || cantidadNum > 1000) {
    return NextResponse.json({ error: "Cantidad inválida (máximo 1000 a la vez)" }, { status: 400 });
  }

  const prefix = prefijo?.trim() || "";
  const rows = Array.from({ length: cantidadNum }, (_, i) => ({
    doctor_id,
    numero: `${prefix}${inicialNum + i}`,
    created_by: user.id,
  }));

  const { error } = await supabase.from("comprobantes").insert(rows);

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Alguno de esos números ya existe (numero debe ser único). Revisa el rango." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, creados: cantidadNum });
}
