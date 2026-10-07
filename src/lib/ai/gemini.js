// Cliente mínimo para Gemini (Google AI Studio) — usado como lector de
// reclamaciones en vez de Qwen-VL (src/lib/ai/qwen.js queda sin usar, por
// si algún día se resuelve el acceso a Qwen-VL y se quiere retomar).
//
// Requiere GEMINI_API_KEY (privada, server-only). Se saca gratis, sin pasos
// de activación de modelo, en https://aistudio.google.com/apikey.
//
// gemini-2.0-flash (el default original) fue retirado por Google después
// de enero 2026 (fecha de corte de conocimiento) — confirmado con un error
// 404 real de la API en producción, que además indicó el reemplazo actual.
// Si este modelo también se retira en el futuro, el mensaje de error de
// Gemini normalmente dice cuál usar en su lugar — o se puede sobreescribir
// con la variable de entorno GEMINI_MODEL sin tocar código.
const DEFAULT_MODEL = "gemini-3.6-flash";

export function isGeminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

// imageBase64 va SIN el prefijo "data:image/...;base64," — Gemini lo pide aparte en mimeType.
export async function askGeminiVision(imageBase64, mimeType, prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Falta configurar GEMINI_API_KEY en el servidor.");
  }

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const body = JSON.stringify({
    contents: [
      {
        parts: [{ inline_data: { mime_type: mimeType, data: imageBase64 } }, { text: prompt }],
      },
    ],
    generationConfig: { responseMimeType: "application/json" },
  });

  const res = await fetchConReintentos(url, body);

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    const blockReason = data?.promptFeedback?.blockReason;
    throw new Error(
      blockReason ? `Gemini bloqueó la respuesta (${blockReason}).` : "Gemini no devolvió contenido."
    );
  }
  return text;
}

// Gemini responde 503 ("high demand") o 429 (límite por minuto del plan
// gratis) en ráfagas: el 26-sep, 6 de 8 reclamaciones capturadas seguidas
// quedaron sin leer por un 503 pasajero. Esos errores se reintentan con
// espera creciente; los demás (400, 403, 404 de modelo retirado…) se
// reportan de una vez porque reintentar no los arregla.
const ESTADOS_PASAJEROS = new Set([429, 500, 502, 503, 504]);
const ESPERAS_MS = [2000, 5000, 12000];

async function fetchConReintentos(url, body) {
  let ultimoError;
  for (let intento = 0; intento <= ESPERAS_MS.length; intento++) {
    if (intento > 0) await esperar(ultimoError.esperaMs);

    let res;
    try {
      res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body });
    } catch (e) {
      ultimoError = { mensaje: `No se pudo conectar con Gemini: ${e.message}`, esperaMs: ESPERAS_MS[intento] };
      continue;
    }
    if (res.ok) return res;

    const text = await res.text().catch(() => "");
    const mensaje = `Gemini respondió ${res.status}: ${text.slice(0, 500)}`;
    if (!ESTADOS_PASAJEROS.has(res.status)) throw new Error(mensaje);

    // Si Gemini dice cuánto esperar, se respeta (con tope de 20 s).
    const retryAfter = Number(res.headers.get("retry-after"));
    const esperaMs = Number.isFinite(retryAfter) && retryAfter > 0
      ? Math.min(retryAfter * 1000, 20000)
      : ESPERAS_MS[intento];
    ultimoError = { mensaje, esperaMs };
  }
  throw new Error(`${ultimoError.mensaje} (tras ${ESPERAS_MS.length + 1} intentos)`);
}

function esperar(ms) {
  // Un poco de azar para que varias reclamaciones no reintenten a la vez.
  return new Promise((r) => setTimeout(r, (ms ?? 2000) + Math.random() * 1000));
}
