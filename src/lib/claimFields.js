// Campos de una reclamación médica, basados en documentos reales:
// - Formulario en papel de ARS Amor y Paz (vía red ASEMAP) — la reclamación
//   individual que llena la secretaria del médico.
// - "Relación" ya consolidada de ARS Senasa (un lote por médico con una fila
//   por reclamación) — el formato de entrega/salida.
//
// Cada ARS tiene su propio formulario, así que solo el bloque "núcleo" es
// obligatorio (aparece en ambos documentos vistos hasta ahora). El resto es
// opcional porque no sabemos todavía si otras ARS lo piden. Cuando lleguen
// más formularios reales, este catálogo se amplía.
export const CLAIM_SECTIONS = [
  {
    title: "Núcleo (obligatorio en toda ARS)",
    fields: [
      { name: "afiliado_nombre", label: "Nombre del afiliado / paciente", type: "text", required: true },
      { name: "no_carnet_nss", label: "No. de carnet / NSS-contrato", type: "text", required: true },
      { name: "no_autorizacion", label: "No. de autorización", type: "text", required: true },
      { name: "fecha_servicio", label: "Fecha del servicio", type: "date", required: true },
      {
        name: "tipo_servicio",
        label: "Tipo de servicio",
        type: "select",
        options: ["Consulta", "Emergencia", "Laboratorio", "Hospitalización", "Servicios dentales", "Honorarios", "Otros"],
        required: true,
      },
      { name: "monto", label: "Monto (RD$)", type: "number", required: true },
    ],
  },
  {
    title: "Afiliado / paciente",
    fields: [
      { name: "paciente_cedula", label: "Cédula", type: "text" },
      { name: "edad", label: "Edad", type: "text" },
      { name: "codigo_afiliado", label: "Código de afiliado / plan", type: "text" },
      { name: "plan", label: "Plan", type: "text" },
      { name: "direccion", label: "Dirección", type: "text" },
      { name: "telefono", label: "Teléfono", type: "text" },
      { name: "nombre_empleador", label: "Nombre del empleador", type: "text" },
      { name: "telefono_empleador", label: "Teléfono del empleador", type: "text" },
      { name: "autorizado_por", label: "Autorizado por", type: "text" },
    ],
  },
  {
    title: "Clínico",
    fields: [
      { name: "diagnostico", label: "Diagnóstico", type: "textarea" },
      { name: "procedimiento", label: "Procedimiento(s) realizado(s)", type: "textarea" },
      { name: "codigo_procedimiento", label: "Código del procedimiento", type: "text" },
      { name: "fecha_ingreso", label: "Fecha de ingreso", type: "date" },
      { name: "fecha_alta", label: "Fecha de alta", type: "date" },
      { name: "no_habitacion", label: "No. de habitación", type: "text" },
      { name: "a_pagar_por_afiliado", label: "A pagar por el afiliado (copago RD$)", type: "number" },
    ],
  },
  {
    title: "Médico",
    fields: [
      { name: "doctor_nombre", label: "Nombre del médico", type: "text" },
      { name: "doctor_codigo", label: "Código / exequátur ante la ARS", type: "text" },
      { name: "doctor_cedula", label: "Cédula del médico", type: "text" },
      { name: "especialidad", label: "Especialidad", type: "text" },
      { name: "centro_medico", label: "Centro médico", type: "text" },
      { name: "telefono_medico", label: "Teléfono del médico", type: "text" },
    ],
  },
  {
    title: "Observaciones",
    fields: [{ name: "observaciones", label: "Observaciones", type: "textarea" }],
  },
];

export const ALL_FIELD_NAMES = CLAIM_SECTIONS.flatMap((s) => s.fields.map((f) => f.name));

export const REQUIRED_FIELD_NAMES = CLAIM_SECTIONS.flatMap((s) =>
  s.fields.filter((f) => f.required).map((f) => f.name)
);

export const CLAIM_STATUS_LABELS = {
  pendiente: "Pendiente de digitar",
  en_proceso: "En proceso",
  revisado: "Revisado",
  en_relacion: "En relación",
  enviado: "Enviado",
  rechazado: "Rechazado",
};
