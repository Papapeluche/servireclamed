// Campos genéricos de una reclamación médica dominicana (ARS).
// Esto es un punto de partida razonable, no el formulario real de ninguna
// ARS específica. Cuando tengamos el formulario real que llenan las
// secretarias, este catálogo se ajusta para que coincida campo por campo.
export const CLAIM_SECTIONS = [
  {
    title: "Afiliado",
    fields: [
      { name: "afiliado_nombre", label: "Nombre del afiliado", type: "text", required: true },
      { name: "afiliado_cedula", label: "Cédula del afiliado", type: "text", required: true },
      { name: "afiliado_no_afiliado", label: "No. de afiliado / póliza", type: "text", required: true },
    ],
  },
  {
    title: "Paciente",
    fields: [
      { name: "paciente_nombre", label: "Nombre del paciente", type: "text", required: true },
      { name: "paciente_cedula", label: "Cédula del paciente", type: "text" },
      {
        name: "parentesco",
        label: "Parentesco con el afiliado",
        type: "select",
        options: ["Titular", "Cónyuge", "Hijo/a", "Otro"],
      },
    ],
  },
  {
    title: "Médico / servicio",
    fields: [
      { name: "doctor_nombre", label: "Nombre del médico", type: "text", required: true },
      { name: "doctor_codigo", label: "Código / exequátur del médico", type: "text" },
      { name: "fecha_servicio", label: "Fecha del servicio", type: "date", required: true },
      { name: "codigo_servicio", label: "Código del servicio/procedimiento", type: "text" },
      { name: "descripcion_servicio", label: "Descripción del servicio", type: "textarea" },
    ],
  },
  {
    title: "Diagnóstico",
    fields: [
      { name: "diagnostico_codigo", label: "Código CIE-10", type: "text" },
      { name: "diagnostico_descripcion", label: "Descripción del diagnóstico", type: "textarea" },
    ],
  },
  {
    title: "Monto",
    fields: [
      { name: "no_factura", label: "No. de factura", type: "text" },
      { name: "monto_reclamado", label: "Monto reclamado (RD$)", type: "number", required: true },
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
