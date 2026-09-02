import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: claim, error: fetchError } = await supabase
    .from("claims")
    .select("id, image_path")
    .eq("id", id)
    .single();

  if (fetchError || !claim) {
    return NextResponse.json({ error: "Reclamación no encontrada" }, { status: 404 });
  }

  // Con RLS, un DELETE sin permiso no da error: simplemente no borra nada.
  // Solo se puede borrar así (sin ser admin) mientras siga pendiente/en
  // proceso — ver migración claims_borrar_pendientes_cualquier_staff.
  const { data, error } = await supabase.from("claims").delete().eq("id", id).select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data || data.length === 0) {
    return NextResponse.json(
      { error: "No se puede borrar esta reclamación (ya fue revisada, o no tienes permiso)." },
      { status: 403 }
    );
  }

  // La imagen huérfana no hace daño, pero no tiene sentido dejarla ocupando
  // espacio en el storage — se borra después de confirmar que sí se pudo
  // borrar la fila (si esto falla, no es grave, solo queda un archivo suelto).
  if (claim.image_path) {
    await supabase.storage.from("reclamaciones-imagenes").remove([claim.image_path]);
  }

  return NextResponse.json({ ok: true });
}
