// Cliente mínimo para Qwen-VL vía DashScope (Alibaba Cloud), usando su
// endpoint "compatible mode" (mismo formato que la API de chat completions
// de OpenAI) para no depender de su SDK propio.
//
// Requiere DASHSCOPE_API_KEY (privada, server-only). Se saca gratis en
// https://modelstudio.console.alibabacloud.com (cuenta internacional —
// tiene cuota de bienvenida gratis y luego es de las IA de visión más
// baratas que existen). DASHSCOPE_BASE_URL es opcional, por si algún día
// se usa la cuenta de China continental en vez de la internacional.
const DEFAULT_BASE_URL = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";
const DEFAULT_MODEL = "qwen-vl-max";

export function isQwenConfigured() {
  return Boolean(process.env.DASHSCOPE_API_KEY);
}

// imageBase64 debe incluir el prefijo data URI, ej. "data:image/jpeg;base64,..."
export async function askQwenVision(imageBase64, prompt) {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    throw new Error("Falta configurar DASHSCOPE_API_KEY en el servidor.");
  }

  const baseUrl = process.env.DASHSCOPE_BASE_URL || DEFAULT_BASE_URL;
  const model = process.env.DASHSCOPE_MODEL || DEFAULT_MODEL;

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: imageBase64 } },
            { type: "text", text: prompt },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`DashScope respondió ${res.status}: ${text.slice(0, 500)}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("DashScope no devolvió contenido en la respuesta.");
  }
  return content;
}

// El modelo a veces envuelve el JSON en ```json ... ``` a pesar de que se
// le pide que no lo haga — se limpia antes de parsear.
export function parseJsonResponse(text) {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  return JSON.parse(cleaned);
}
