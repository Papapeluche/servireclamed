import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";
import { createClient } from "@/lib/supabase/server";
import { mejorarEscaneo } from "@/lib/imagenesRelacion";

export const runtime = "nodejs";

export async function GET(request, { params }) {
  const { id } = await params;
  const format = new URL(request.url).searchParams.get("format") || "jpeg";
  const selectedClaimId = new URL(request.url).searchParams.get("claimId");
  if (!["jpeg", "pdf", "original"].includes(format)) return new Response("Formato no válido", { status: 400 });
  const supabase = await createClient();
  const { data: relacion } = await supabase.from("relaciones").select("id").eq("id", id).maybeSingle();
  if (!relacion) return new Response("Relación no encontrada", { status: 404 });

  const { data: rows, error } = await supabase.from("relacion_claims")
    .select("orden, claims(id, image_path, afiliado_nombre)").eq("relacion_id", id).order("orden");
  if (error) return new Response(error.message, { status: 500 });
  const selectedRows = selectedClaimId ? (rows || []).filter((r) => r.claims?.id === selectedClaimId) : rows || [];
  if (selectedClaimId && !selectedRows.length) return new Response("Reclamación fuera de esta relación", { status: 404 });
  const zip = new JSZip();
  const pdf = format === "pdf" ? await PDFDocument.create() : null;
  const manifest = ["numero,claim_id,afiliado,archivo"];
  const width = String(rows?.length || 1).length;

  for (const row of selectedRows) {
    const index = (rows || []).indexOf(row);
    const claim = row.claims;
    if (!claim?.image_path) return new Response(`Falta la imagen de la fila ${index + 1}`, { status: 409 });
    const { data, error: downloadError } = await supabase.storage
      .from("reclamaciones-imagenes").download(claim.image_path);
    if (downloadError || !data) return new Response(`No se pudo descargar la imagen de la fila ${index + 1}`, { status: 502 });
    let improved;
    try {
      improved = format === "original"
        ? { bytes: Buffer.from(await data.arrayBuffer()), extension: claim.image_path.split(".").pop()?.toLowerCase() || "jpg" }
        : await mejorarEscaneo(data, claim.image_path);
    } catch {
      return new Response(`No se pudo mejorar la imagen de la fila ${index + 1}`, { status: 422 });
    }
    const filename = `${String(index + 1).padStart(width, "0")}_reclamacion.${improved.extension}`;
    if (pdf) {
      if (improved.extension === "pdf") {
        const source = await PDFDocument.load(improved.bytes);
        const pages = await pdf.copyPages(source, source.getPageIndices());
        for (const page of pages) pdf.addPage(page);
      } else {
        const embedded = await pdf.embedJpg(improved.bytes);
        const [pageWidth, pageHeight] = embedded.width > embedded.height ? [841.89, 595.28] : [595.28, 841.89];
        const page = pdf.addPage([pageWidth, pageHeight]);
        const scale = Math.min((pageWidth - 36) / embedded.width, (pageHeight - 36) / embedded.height);
        page.drawImage(embedded, {
          x: (pageWidth - embedded.width * scale) / 2,
          y: (pageHeight - embedded.height * scale) / 2,
          width: embedded.width * scale, height: embedded.height * scale,
        });
      }
    } else zip.file(filename, improved.bytes);
    manifest.push([index + 1, claim.id, claim.afiliado_nombre || "", filename]
      .map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","));
  }
  if (pdf) {
    return new Response(Buffer.from(await pdf.save()), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${selectedClaimId ? `reclamacion_${String((rows || []).indexOf(selectedRows[0]) + 1).padStart(width, "0")}` : `relacion_imagenes_${id}`}.pdf"`,
      },
    });
  }
  zip.file("indice.csv", "\uFEFF" + manifest.join("\r\n"));
  const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="relacion_imagenes_${format}_${id}.zip"`,
    },
  });
}
