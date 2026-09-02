// Campos disponibles para el encabezado de una relación (los datos del
// médico/ARS que se repiten una sola vez por relación, no por reclamación).
export const HEADER_FIELD_OPTIONS = [
  { field: "fecha", label: "Fecha" },
  { field: "ars_nombre", label: "ARS" },
  { field: "ars_rnc", label: "RNC de la ARS" },
  { field: "doctor_nombre", label: "Médico" },
  { field: "doctor_cedula", label: "Cédula del médico" },
  { field: "doctor_codigo", label: "Código / exequátur" },
  { field: "doctor_rnc", label: "RNC del médico (si factura por negocio, en vez de cédula)" },
  { field: "especialidad", label: "Especialidad" },
  { field: "centro_medico", label: "Centro médico" },
  { field: "telefono_medico", label: "Teléfono del médico" },
  { field: "ncf", label: "NCF" },
  { field: "ncf_vencimiento", label: "Fecha de vencimiento del NCF" },
];

export const HEADER_FIELD_LABELS = Object.fromEntries(
  HEADER_FIELD_OPTIONS.map((f) => [f.field, f.label])
);

// Layout de fábrica cuando la relación/hoja no tiene una plantilla propia
// asignada — se usa tanto al generar el archivo real (rutas API) como en la
// vista previa, para que ambos coincidan siempre.
export const DEFAULT_RELACION_HEADER_FIELDS = [
  { field: "fecha", label: "Fecha" },
  { field: "doctor_nombre", label: "Médico" },
  { field: "doctor_cedula", label: "Cédula" },
  { field: "doctor_codigo", label: "Código" },
  { field: "especialidad", label: "Especialidad" },
  { field: "centro_medico", label: "Centro" },
  { field: "telefono_medico", label: "Teléfono" },
];

export const DEFAULT_RELACION_TABLE_COLUMNS = [
  { field: "afiliado_nombre", label: "Afiliado" },
  { field: "no_carnet_nss", label: "NSS contrato" },
  { field: "no_autorizacion", label: "No. Autorización" },
  { field: "fecha_servicio", label: "Fecha de Servicio" },
  { field: "tipo_servicio", label: "Tipo de Servicio" },
  { field: "monto", label: "Valor RD$" },
];

export const DEFAULT_HOJA_HEADER_FIELDS = [
  { field: "ars_nombre", label: "ARS" },
  { field: "ars_rnc", label: "RNC" },
  { field: "fecha", label: "Fecha" },
  { field: "doctor_nombre", label: "Médico" },
  { field: "doctor_cedula", label: "Cédula" },
  { field: "doctor_codigo", label: "Código" },
  { field: "especialidad", label: "Especialidad" },
  { field: "centro_medico", label: "Centro" },
  { field: "telefono_medico", label: "Teléfono" },
];

export const DEFAULT_HOJA_CATEGORIAS = [{ label: "Total", tipos: [] }];

// Los datos del médico/ARS que se repiten una sola vez por relación — se
// arman igual en la vista previa y en las rutas que generan el archivo
// real, para que lo que se ve antes de descargar sea justo lo que sale.
export function buildRelacionValues(relacion, comprobante) {
  return {
    fecha: relacion.fecha,
    ars_nombre: relacion.ars_catalog?.nombre || "",
    ars_rnc: relacion.ars_catalog?.rnc || "",
    doctor_nombre: relacion.doctor_nombre || "",
    doctor_cedula: relacion.doctor_cedula || "",
    doctor_rnc: relacion.doctor_rnc || "",
    doctor_codigo: relacion.doctor_codigo || "",
    especialidad: relacion.especialidad || "",
    centro_medico: relacion.centro_medico || "",
    telefono_medico: relacion.telefono_medico || "",
    ncf: comprobante?.numero || "",
    ncf_vencimiento: comprobante?.vencimiento || "",
  };
}
