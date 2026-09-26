import JSZip from "jszip";
import { createClient } from "@/lib/supabase/server";

export async function GET(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: relacion } = await supabase.from("relaciones").select("id").eq("id", id).maybeSingle();
  if (!relacion) return new Response("Relación no encontrada", { status: 404 });

  const { data: rows, error } = await supabase.from("relacion_claims")
    .select("orden, claims(id, image_path, afiliado_nombre)").eq("relacion_id", id).order("orden");
  if (error) return new Response(error.message, { status: 500 });
  const zip = new JSZip();
  const manifest = ["numero,claim_id,afiliado,archivo"];
  const width = String(rows?.length || 1).length;

  for (const [index, row] of (rows || []).entries()) {
    const claim = row.claims;
    if (!claim?.image_path) return new Response(`Falta la imagen de la fila ${index + 1}`, { status: 409 });
    const { data, error: downloadError } = await supabase.storage
      .from("reclamaciones-imagenes").download(claim.image_path);
    if (downloadError || !data) return new Response(`No se pudo descargar la imagen de la fila ${index + 1}`, { status: 502 });
    const ext = claim.image_path.split(".").pop()?.toLowerCase();
    const filename = `${String(index + 1).padStart(width, "0")}_reclamacion.${["jpg", "jpeg", "png", "webp", "pdf"].includes(ext) ? ext : "jpg"}`;
    zip.file(filename, await data.arrayBuffer());
    manifest.push([index + 1, claim.id, claim.afiliado_nombre || "", filename]
      .map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","));
  }
  zip.file("indice.csv", "\uFEFF" + manifest.join("\r\n"));
  const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="relacion_imagenes_${id}.zip"`,
    },
  });
}
