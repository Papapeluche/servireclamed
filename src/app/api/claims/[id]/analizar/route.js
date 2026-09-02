import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { askQwenVision, parseJsonResponse, isQwenConfigured } from "@/lib/ai/qwen";
import { buildExtractionPrompt } from "@/lib/ai/extractionPrompt";
import { ALL_FIELD_NAMES, FIELD_BY_NAME } from "@/lib/claimFields";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function coerceValue(name, raw) {
  if (raw === null || raw === undefined || raw === "") return null;
  const field = FIELD_BY_NAME[name];
  if (!field) return null;

  if (field.type === "number") {
    const n = Number(String(raw).replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  if (field.type === "date") {
    return DATE_RE.test(raw) ? raw : null;
  }
  if (field.type === "select") {
    return field.options.includes(raw) ? raw : null;
  }
  return String(raw).trim() || null;
}

export async function POST(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();

  if (!isQwenConfigured()) {
    return NextResponse.json(
      {
        error:
          "Falta configurar DASHSCOPE_API_KEY en el servidor — sin eso no se puede leer la reclamación automáticamente. La reclamación queda pendiente de digitar a mano mientras tanto.",
      },
      { status: 501 }
    );
  }

  const { data: claim, error: claimError } = await supabase
    .from("claims")
    .select("id, image_path, status")
    .eq("id", id)
    .single();

  if (claimError || !claim) {
    return NextResponse.json({ error: "Reclamación no encontrada" }, { status: 404 });
  }

  // No pisar el trabajo de alguien que ya la revisó/avanzó a mano.
  if (!["pendiente", "en_proceso"].includes(claim.status)) {
    return NextResponse.json(
      { error: "Esta reclamación ya se digitó o revisó — no se vuelve a analizar automáticamente." },
      { status: 409 }
    );
  }

  const { data: signed, error: signedError } = await supabase.storage
    .from("reclamaciones-imagenes")
    .createSignedUrl(claim.image_path, 300);

  if (signedError || !signed?.signedUrl) {
    return NextResponse.json({ error: "No se pudo leer la imagen de la reclamación." }, { status: 500 });
  }

  let extracted;
  try {
    const imgRes = await fetch(signed.signedUrl);
    const buf = Buffer.from(await imgRes.arrayBuffer());
    const dataUri = `data:image/jpeg;base64,${buf.toString("base64")}`;

    const raw = await askQwenVision(dataUri, buildExtractionPrompt());
    extracted = parseJsonResponse(raw);
  } catch (err) {
    await supabase.from("claims").update({ ai_error: String(err.message || err).slice(0, 500) }).eq("id", id);
    return NextResponse.json({ error: `No se pudo analizar la imagen: ${err.message}` }, { status: 502 });
  }

  const payload = {};
  for (const name of ALL_FIELD_NAMES) {
    if (name in extracted) {
      const value = coerceValue(name, extracted[name]);
      if (value !== null) payload[name] = value;
    }
  }

  const lowConfidence = Array.isArray(extracted.campos_inciertos)
    ? extracted.campos_inciertos.filter((f) => ALL_FIELD_NAMES.includes(f))
    : [];

  // La ARS es texto libre del modelo — se intenta emparejar contra el
  // catálogo real por nombre (sin distinguir mayúsculas/acentos exactos);
  // si no hay match claro, se deja sin asignar para que el digitador la
  // elija a mano en vez de adivinar un ars_id incorrecto.
  if (extracted.ars_nombre) {
    const { data: arsMatches } = await supabase
      .from("ars_catalog")
      .select("id, nombre")
      .eq("activo", true);
    const needle = String(extracted.ars_nombre).trim().toLowerCase();
    const match = (arsMatches || []).find(
      (a) => a.nombre.toLowerCase().includes(needle) || needle.includes(a.nombre.toLowerCase())
    );
    if (match) payload.ars_id = match.id;
  }

  payload.low_confidence_fields = lowConfidence;
  payload.ai_procesado_at = new Date().toISOString();
  payload.ai_error = null;
  if (claim.status === "pendiente") payload.status = "en_proceso";

  const { error: updateError } = await supabase.from("claims").update(payload).eq("id", id);
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    camposLlenados: Object.keys(payload).filter((k) => ALL_FIELD_NAMES.includes(k)).length,
    inciertos: lowConfidence.length,
  });
}
