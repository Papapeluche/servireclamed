// Cliente mínimo para Gemini (Google AI Studio) — usado como lector de
// reclamaciones en vez de Qwen-VL (src/lib/ai/qwen.js queda sin usar, por
// si algún día se resuelve el acceso a Qwen-VL y se quiere retomar).
//
// Requiere GEMINI_API_KEY (privada, server-only). Se saca gratis, sin pasos
// de activación de modelo, en https://aistudio.google.com/apikey.
const DEFAULT_MODEL = "gemini-2.0-flash";

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

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ inline_data: { mime_type: mimeType, data: imageBase64 } }, { text: prompt }],
        },
      ],
      generationConfig: { responseMimeType: "application/json" },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Gemini respondió ${res.status}: ${text.slice(0, 500)}`);
  }

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
