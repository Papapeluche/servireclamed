import { createClient } from "@/lib/supabase/server";
import { mejorarEscaneo } from "@/lib/imagenesRelacion";

export const runtime = "nodejs";

export async function GET(request, { params }) {
  const { id, claimId } = await params;
  const supabase = await createClient();
  const { data: row } = await supabase.from("relacion_claims")
    .select("claims(id, image_path)").eq("relacion_id", id).eq("claim_id", claimId).maybeSingle();
  if (!row?.claims?.image_path) return new Response("Imagen no encontrada", { status: 404 });
  const { data, error } = await supabase.storage.from("reclamaciones-imagenes")
    .download(row.claims.image_path);
  if (error || !data) return new Response("No se pudo leer la imagen", { status: 502 });
  try {
    const improved = await mejorarEscaneo(data, row.claims.image_path);
    return new Response(improved.bytes, {
      headers: { "Content-Type": improved.contentType, "Cache-Control": "private, max-age=300" },
    });
  } catch {
    return new Response("No se pudo preparar la vista previa", { status: 422 });
  }
}
