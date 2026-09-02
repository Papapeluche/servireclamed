import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { askGeminiVision, isGeminiConfigured } from "@/lib/ai/gemini";
import { parseJsonResponse } from "@/lib/ai/json";
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

// Guarda el error en la reclamación (si ya existe la fila) para que quede
// diagnosticable consultando la base de datos, en vez de perderse si nadie
// vio la respuesta HTTP en el momento. No lanza si esto mismo falla.
async function recordError(supabase, id, message) {
  try {
    await supabase.from("claims").update({ ai_error: String(message).slice(0, 500) }).eq("id", id);
  } catch {
    // no hay más que hacer si ni esto se pudo guardar
  }
}

export async function POST(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();

  if (!isGeminiConfigured()) {
    const msg = "Falta configurar GEMINI_API_KEY en el servidor.";
    await recordError(supabase, id, msg);
    return NextResponse.json(
      { error: `${msg} La reclamación queda pendiente de digitar a mano mientras tanto.` },
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

  // Todo lo que sigue puede fallar de formas distintas (leer la imagen,
  // llamar a Gemini, parsear su respuesta, guardar) — se envuelve entero
  // para que CUALQUIER falla quede registrada en ai_error, no solo la de
  // la llamada a la IA.
  try {
    const { data: signed, error: signedError } = await supabase.storage
      .from("reclamaciones-imagenes")
      .createSignedUrl(claim.image_path, 300);

    if (signedError || !signed?.signedUrl) {
      throw new Error("No se pudo generar el link firmado de la imagen.");
    }

    const imgRes = await fetch(signed.signedUrl);
    if (!imgRes.ok) {
      throw new Error(`No se pudo descargar la imagen (${imgRes.status}).`);
    }
    const buf = Buffer.from(await imgRes.arrayBuffer());
    const base64 = buf.toString("base64");

    const raw = await askGeminiVision(base64, "image/jpeg", buildExtractionPrompt());
    const extracted = parseJsonResponse(raw);

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
    if (updateError) throw new Error(updateError.message);

    return NextResponse.json({
      ok: true,
      camposLlenados: Object.keys(payload).filter((k) => ALL_FIELD_NAMES.includes(k)).length,
      inciertos: lowConfidence.length,
    });
  } catch (err) {
    const message = err.message || String(err);
    await recordError(supabase, id, message);
    return NextResponse.json({ error: `No se pudo analizar la imagen: ${message}` }, { status: 502 });
  }
}
