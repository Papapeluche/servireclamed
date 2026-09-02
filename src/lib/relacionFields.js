// Campos disponibles para el encabezado de una relación (los datos del
// médico/ARS que se repiten una sola vez por relación, no por reclamación).
export const HEADER_FIELD_OPTIONS = [
  { field: "fecha", label: "Fecha" },
  { field: "ars_nombre", label: "ARS" },
  { field: "doctor_nombre", label: "Médico" },
  { field: "doctor_cedula", label: "Cédula del médico" },
  { field: "doctor_codigo", label: "Código / exequátur" },
  { field: "especialidad", label: "Especialidad" },
  { field: "centro_medico", label: "Centro médico" },
  { field: "telefono_medico", label: "Teléfono del médico" },
];

export const HEADER_FIELD_LABELS = Object.fromEntries(
  HEADER_FIELD_OPTIONS.map((f) => [f.field, f.label])
);
