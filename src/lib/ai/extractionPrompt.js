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

  return `Eres un asistente que transcribe formularios de reclamaciones médicas en papel de la República Dominicana, muchas veces llenados a mano. Se te da la foto de UN formulario. Cada ARS (Senasa, Humano, CMD, ARS Reservas, MAPFRE, ARS-UASD, Yunen, Universal, Amor y Paz, etc.) nombra sus casillas distinto — tienes que reconocer el dato por lo que ES, no solo por si el texto impreso calza exacto con el nombre del campo.

Devuelve ÚNICAMENTE un objeto JSON válido (sin \`\`\`, sin explicación, sin texto antes o después) con estas claves:

- ars_nombre: el nombre de la ARS (aseguradora) que aparece en el formulario, tal como está escrito o impreso ahí (puede ser un logo/encabezado). null si no aparece.
${fieldLines}
- campos_inciertos: array con los nombres exactos (los de arriba, ej. "afiliado_nombre") de los campos que llenaste pero de los que no estás totalmente seguro — letra ambigua, tachada, adivinada, o que inferiste por sinónimo/formato en vez de una etiqueta exacta (ver reglas abajo). Si un campo simplemente no aparece en el formulario, ponlo en null y NO lo incluyas en este array (no es "incierto", es "no aplica").

Cómo reconocer el dato correcto aunque la ARS lo llame distinto (marca esos casos en campos_inciertos, por si acaso):
- no_carnet_nss: puede aparecer como "NSS", "No. de carnet", "código asegurado", "número de afiliado" o similar — es el número que identifica al afiliado ANTE LA ARS, no su cédula personal.
- doctor_codigo: puede aparecer como "código PSS", "código del prestador", "exequátur", o simplemente "código" en la sección del médico/prestador — NO es el código del afiliado/paciente.
- doctor_nombre: la sección suele decir "Prestador de Servicios de Salud (PSS)", "Datos del médico", o similar — el nombre ahí es el del médico/clínica, no del paciente.
- Si el formulario tiene una sola fecha en el encabezado (ej. "Fecha: ...") y no hay una fecha de servicio separada, esa fecha del encabezado casi siempre ES la fecha del servicio (fecha_servicio).
- fecha_vencimiento_autorizacion es una fecha de vencimiento/validez DISTINTA a la fecha del servicio — la mayoría de formularios NO la tienen. Si no ves una casilla separada explícitamente para esto, déjalo null. No la confundas con la fecha del encabezado.

Las personas cometen errores al llenar el papel a mano (escriben un dato en la casilla equivocada, tachan y corrigen al lado, etc.). Si lo que está escrito en una casilla no calza con lo que esa casilla debería contener pero SÍ calza con el formato de otro campo (ej. algo con forma de cédula "XXX-XXXXXXX-X" escrito en la casilla de "número de contacto/teléfono"), usa el FORMATO del dato para decidir a qué campo pertenece en realidad, no ciegamente la etiqueta de la casilla — y márcalo en campos_inciertos.

Reglas:
- Si un campo no aparece en el formulario, no puedes verlo con claridad, o no estás razonablemente seguro de que ese dato específico esté ahí, su valor debe ser null. NUNCA inventes ni completes un dato "porque suena razonable" — es preferible dejar algo en blanco (para que un humano lo revise) que inventarlo. Esto aplica sobre todo a fechas: no pongas una fecha si no ves una fecha escrita para ese campo específico.
- Los montos son en pesos dominicanos (RD$) — devuelve solo el número.
- Las fechas siempre en formato AAAA-MM-DD (convierte desde el formato que uses en el formulario — en República Dominicana las fechas manuscritas casi siempre son DD/MM/AA o DD/MM/AAAA, ej. 20/8/26 -> 2026-08-20, NO 2026-08-... interpretado como mes/día).
- Para "tipo_servicio", si no calza exactamente con ninguna opción de la lista, usa "Otros".
- Responde SOLO el JSON.`;
}
