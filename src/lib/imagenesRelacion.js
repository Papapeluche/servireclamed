import sharp from "sharp";

// Mejora óptica moderada. Sin recorte, rotación, generación ni sustitución
// de texto: la foto original permanece intacta en Storage.
export async function mejorarEscaneo(blob, path) {
  const original = Buffer.from(await blob.arrayBuffer());
  if (path.toLowerCase().endsWith(".pdf")) {
    return { bytes: original, extension: "pdf", contentType: "application/pdf" };
  }
  const bytes = await sharp(original, { failOn: "none" })
    .rotate() // Respeta únicamente la orientación EXIF; conserva el cuadro entero.
    .modulate({ brightness: 1.03 })
    .sharpen({ sigma: 1 })
    .jpeg({ quality: 93, mozjpeg: true })
    .toBuffer();
  return { bytes, extension: "jpg", contentType: "image/jpeg" };
}
