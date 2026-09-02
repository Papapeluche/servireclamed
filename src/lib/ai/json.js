// Algunos modelos envuelven el JSON en ```json ... ``` a pesar de que se
// les pide que no lo hagan — se limpia antes de parsear. Compartido entre
// proveedores (Gemini, Qwen).
export function parseJsonResponse(text) {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  return JSON.parse(cleaned);
}
