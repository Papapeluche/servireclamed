// Valores de ejemplo para la vista previa de una plantilla — una plantilla
// sola no tiene datos reales de ninguna relación todavía, así que se
// rellena con datos ficticios que respetan el tipo de cada campo, para que
// la vista previa se vea como saldría el documento real.
import { FIELD_BY_NAME } from "@/lib/claimFields";

const HEADER_SAMPLES = {
  fecha: "02/09/2026",
  ars_nombre: "ARS Ejemplo",
  ars_rnc: "1-01-00000-0",
  doctor_nombre: "Dr. Juan Pérez",
  doctor_cedula: "001-0000000-0",
  doctor_codigo: "12345",
  doctor_rnc: "1-01-11111-1",
  especialidad: "Medicina Interna",
  centro_medico: "Centro Médico Ejemplo",
  telefono_medico: "809-000-0000",
  ncf: "B0100000001",
  ncf_vencimiento: "31/12/2026",
};

export function sampleHeaderValue(field) {
  return HEADER_SAMPLES[field] || FIELD_BY_NAME[field]?.label || "Ejemplo";
}

const CLAIM_SAMPLES = {
  afiliado_nombre: ["María Rodríguez", "José Martínez", "Ana García"],
  no_carnet_nss: ["1234567", "7654321", "9988776"],
  no_autorizacion: ["A-000123", "A-000124", "A-000125"],
  fecha_servicio: ["01/09/2026", "02/09/2026", "03/09/2026"],
  tipo_servicio: ["Consulta", "Laboratorio", "Farmacia"],
};

export function sampleTableValue(field, rowIndex) {
  if (CLAIM_SAMPLES[field]) return CLAIM_SAMPLES[field][rowIndex % CLAIM_SAMPLES[field].length];
  const meta = FIELD_BY_NAME[field];
  if (field === "monto" || meta?.type === "number") return (500 * (rowIndex + 1)).toFixed(2);
  if (meta?.type === "date") return "01/09/2026";
  if (meta?.type === "select") return meta.options?.[0] || "Ejemplo";
  return `Ejemplo ${rowIndex + 1}`;
}
