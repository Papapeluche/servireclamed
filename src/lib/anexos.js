// Sube una hoja de anexo de una reclamación (desde el navegador, con la
// sesión del usuario) y la registra. Los anexos van en el mismo bucket de
// las fotos, bajo anexos/<claim_id>/, y se ordenan por fecha de captura.
export async function subirAnexo(supabase, claimId, blob) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const imagePath = `anexos/${claimId}/${crypto.randomUUID()}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from("reclamaciones-imagenes")
    .upload(imagePath, blob, { contentType: "image/jpeg" });
  if (uploadError) throw new Error(uploadError.message);

  const { data, error } = await supabase
    .from("claim_anexos")
    .insert({ claim_id: claimId, image_path: imagePath, created_by: user?.id ?? null })
    .select("id, image_path, created_at")
    .single();
  if (error) {
    await supabase.storage.from("reclamaciones-imagenes").remove([imagePath]);
    throw new Error(error.message);
  }
  return data;
}

export async function quitarAnexo(claimId, anexoId) {
  const res = await fetch(`/api/claims/${claimId}/anexos/${anexoId}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "No se pudo quitar el anexo.");
  }
}

const MAX_LADO_SUBIDA = 2400;

// Las fotos de galería pueden venir en PNG (capturas de pantalla), WebP o
// pesar 5+ MB; todo se guarda como JPEG (así lo esperan la IA y el escaneo)
// y a un tamaño que sobra para leer un formulario.
export async function aJpeg(file) {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const escala = Math.min(1, MAX_LADO_SUBIDA / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * escala);
    canvas.height = Math.round(bmp.height * escala);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff"; // fondo blanco para PNG con transparencia
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close?.();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    return blob || file;
  } catch {
    // Un formato que este navegador no sabe leer: se sube tal cual.
    return file;
  }
}
