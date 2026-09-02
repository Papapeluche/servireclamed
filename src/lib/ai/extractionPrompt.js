// Arma el prompt de extracción a partir del MISMO esquema de campos que ya
// usa el formulario de digitación (src/lib/claimFields.js) — así el
// catálogo de campos vive en un solo lugar; si se agrega un campo nuevo al
// formulario, la IA automáticamente empieza a pedirlo también.
import { CLAIM_SECTIONS } from "@/lib/claimFields";

function describeField(field) {
  let type = "texto libre";
  if (field.type === "number") type = "número (sin RD$, sin comas, solo dígitos y punto decimal)";
  if (field.type === "date") type = "fecha en formato AAAA-MM-DD";
  if (field.type === "select") type = `exactamente uno de: ${field.options.map((o) => `"${o}"`).join(", ")}`;
  if (field.type === "textarea") type = "texto libre (puede ser largo)";
  return `- ${field.name}: ${field.label} — ${type}`;
}

export function buildExtractionPrompt() {
  const fieldLines = CLAIM_SECTIONS.flatMap((section) => section.fields.map(describeField)).join("\n");

  return `Eres un asistente que transcribe formularios de reclamaciones médicas en papel de la República Dominicana, muchas veces llenados a mano. Se te da la foto de UN formulario.

Devuelve ÚNICAMENTE un objeto JSON válido (sin \`\`\`, sin explicación, sin texto antes o después) con estas claves:

- ars_nombre: el nombre de la ARS (aseguradora) que aparece en el formulario, tal como está escrito o impreso ahí (puede ser un logo/encabezado). null si no aparece.
${fieldLines}
- campos_inciertos: array con los nombres exactos (los de arriba, ej. "afiliado_nombre") de los campos que SÍ llenaste pero de los que no estás totalmente seguro — letra ambigua, tachada, o adivinaste parcialmente. Si un campo simplemente no aparece en el formulario, ponlo en null y NO lo incluyas en este array (no es "incierto", es "no aplica").

Reglas:
- Si un campo no aparece en el formulario o la letra es completamente ilegible, su valor debe ser null (no inventes datos).
- Los montos son en pesos dominicanos (RD$) — devuelve solo el número.
- Las fechas siempre en formato AAAA-MM-DD (convierte desde el formato que uses en el formulario, ej. 02/09/2026 -> 2026-09-02).
- Para "tipo_servicio", si no calza exactamente con ninguna opción de la lista, usa "Otros".
- Responde SOLO el JSON.`;
}
