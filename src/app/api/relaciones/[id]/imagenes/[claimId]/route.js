import { createClient } from "@/lib/supabase/server";
import { escanearDocumento } from "@/lib/escaneo";
import { rutaEscaneo } from "@/lib/escaneoRuta";

export const runtime = "nodejs";
export const maxDuration = 60;

const BUCKET = "reclamaciones-imagenes";

// Una imagen por petición (no el lote entero): así una relación de cientos
// de reclamaciones nunca choca con el límite de tiempo de Vercel — el
// navegador las va pidiendo de a pocas y arma el PDF/ZIP él mismo.
//   ?tipo=original   -> la foto tal cual se tomó
//   ?regenerar=1     -> vuelve a escanear aunque ya exista en caché
//   ?anexo=<id>      -> una hoja de anexo de esa reclamación, en vez de la principal
export async function GET(request, { params }) {
  const { id, claimId } = await params;
  const url = new URL(request.url);
  const tipo = url.searchParams.get("tipo") === "original" ? "original" : "escaneo";
  const regenerar = url.searchParams.get("regenerar") === "1";
  const anexoId = url.searchParams.get("anexo");

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("relacion_claims")
    .select("claims(id, image_path)")
    .eq("relacion_id", id)
    .eq("claim_id", claimId)
    .maybeSingle();
  let imagePath = row?.claims?.image_path;
  if (row && anexoId) {
    const { data: anexo } = await supabase
      .from("claim_anexos")
      .select("image_path")
      .eq("id", anexoId)
      .eq("claim_id", claimId)
      .maybeSingle();
    imagePath = anexo?.image_path;
  }
  if (!imagePath) return new Response("Imagen no encontrada", { status: 404 });

  const storage = supabase.storage.from(BUCKET);
  const cache = rutaEscaneo(imagePath);

  if (tipo === "escaneo" && !regenerar) {
    const { data: guardado } = await storage.download(cache);
    if (guardado) return imagen(guardado, "image/jpeg", "cache");
  }

  const { data: original, error } = await storage.download(imagePath);
  if (error || !original) return new Response("No se pudo leer la imagen", { status: 502 });
  if (tipo === "original") return imagen(original, original.type || "image/jpeg", "original");

  let escaneo;
  try {
    escaneo = await escanearDocumento(Buffer.from(await original.arrayBuffer()));
  } catch {
    return new Response("No se pudo escanear esta imagen", { status: 422 });
  }

  // Guardar en caché no es crítico: si falla, la próxima vez se vuelve a escanear.
  if (regenerar) await storage.remove([cache]);
  await storage.upload(cache, escaneo.bytes, { contentType: "image/jpeg", upsert: false });

  return imagen(escaneo.bytes, "image/jpeg", escaneo.recortado ? "nuevo-recortado" : "nuevo");
}

function imagen(cuerpo, contentType, origen) {
  return new Response(cuerpo, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, no-store",
      "X-Escaneo": origen,
    },
  });
}
