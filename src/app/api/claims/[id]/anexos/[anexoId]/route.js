import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rutaEscaneo } from "@/lib/escaneoRuta";

export async function DELETE(request, { params }) {
  const { id, anexoId } = await params;
  const supabase = await createClient();

  const { data: anexo } = await supabase
    .from("claim_anexos")
    .select("id, image_path")
    .eq("id", anexoId)
    .eq("claim_id", id)
    .maybeSingle();
  if (!anexo) return NextResponse.json({ error: "Anexo no encontrado" }, { status: 404 });

  // Con RLS, un DELETE sin permiso no da error: simplemente no borra nada.
  const { data, error } = await supabase.from("claim_anexos").delete().eq("id", anexoId).select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data?.length) {
    return NextResponse.json({ error: "No tienes permiso para quitar este anexo." }, { status: 403 });
  }

  await supabase.storage
    .from("reclamaciones-imagenes")
    .remove([anexo.image_path, rutaEscaneo(anexo.image_path)]);

  return NextResponse.json({ ok: true });
}
