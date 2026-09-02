import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";
import { HEADER_FIELD_LABELS } from "@/lib/relacionFields";

const DEFAULT_HEADER_FIELDS = [
  { field: "fecha", label: "Fecha" },
  { field: "doctor_nombre", label: "Médico" },
  { field: "doctor_cedula", label: "Cédula" },
  { field: "doctor_codigo", label: "Código" },
  { field: "especialidad", label: "Especialidad" },
  { field: "centro_medico", label: "Centro" },
  { field: "telefono_medico", label: "Teléfono" },
];

const DEFAULT_TABLE_COLUMNS = [
  { field: "afiliado_nombre", label: "Afiliado" },
  { field: "no_carnet_nss", label: "NSS contrato" },
  { field: "no_autorizacion", label: "No. Autorización" },
  { field: "fecha_servicio", label: "Fecha de Servicio" },
  { field: "tipo_servicio", label: "Tipo de Servicio" },
  { field: "monto", label: "Valor RD$" },
];

async function buildWorkbook(supabase, id, overrides) {
  const { data: relacion, error: relacionError } = await supabase
    .from("relaciones")
    .select(
      "id, fecha, total_monto, template_id, doctor_nombre, doctor_cedula, doctor_rnc, doctor_codigo, especialidad, centro_medico, telefono_medico, ars_catalog(nombre, rnc)"
    )
    .eq("id", id)
    .single();

  if (relacionError || !relacion) {
    return { error: "Relación no encontrada", status: 404 };
  }

  let headerFields = overrides?.header_fields;
  let tableColumns = overrides?.table_columns;
  let totalField = overrides?.total_field;

  if (!headerFields?.length || !tableColumns?.length) {
    let template = null;
    if (relacion.template_id) {
      const { data } = await supabase
        .from("export_templates")
        .select("header_fields, table_columns, total_field")
        .eq("id", relacion.template_id)
        .single();
      template = data;
    }

    if (!headerFields?.length) {
      headerFields = template?.header_fields?.length ? template.header_fields : DEFAULT_HEADER_FIELDS;
    }
    if (!tableColumns?.length) {
      tableColumns = template?.table_columns?.length ? template.table_columns : DEFAULT_TABLE_COLUMNS;
    }
    if (!totalField) totalField = template?.total_field || "monto";
  }
  if (!totalField) totalField = "monto";

  const { data: rows, error: rowsError } = await supabase
    .from("relacion_claims")
    .select("orden, claims(*)")
    .eq("relacion_id", id)
    .order("orden");

  if (rowsError) {
    return { error: rowsError.message, status: 500 };
  }

  const relacionValues = {
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
  };

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Relación");
  sheet.columns = [{ width: 4 }, ...tableColumns.map(() => ({ width: 20 }))];

  const bold = { bold: true };

  sheet.addRow([]);
  for (const hf of headerFields) {
    const label = hf.label || HEADER_FIELD_LABELS[hf.field] || hf.field;
    sheet.addRow([null, `${label}:`, relacionValues[hf.field] ?? ""]);
  }
  sheet.addRow([]);

  const tituloRow = sheet.addRow([null, "DETALLES DE LOS SERVICIOS PRESTADOS"]);
  tituloRow.getCell(2).font = bold;
  sheet.addRow([]);

  const headerRow = sheet.addRow([null, ...tableColumns.map((c) => c.label)]);
  headerRow.font = bold;
  sheet.addRow([]);

  let total = 0;
  (rows || []).forEach((row, idx) => {
    const c = row.claims || {};
    total += Number(c[totalField] || 0);
    sheet.addRow([idx + 1, ...tableColumns.map((col) => c[col.field] ?? "")]);
  });

  sheet.addRow([]);
  const totalLabelCol = Math.max(1, tableColumns.length - 1);
  const totalRowValues = new Array(tableColumns.length + 1).fill(null);
  totalRowValues[totalLabelCol] = "Total:";
  totalRowValues[tableColumns.length] = total;
  const totalRow = sheet.addRow(totalRowValues);
  totalRow.font = bold;

  const buffer = await workbook.xlsx.writeBuffer();
  const arsName = (relacion.ars_catalog?.nombre || "ARS").replace(/\s+/g, "_");
  const doctorName = (relacion.doctor_nombre || "sin_medico").replace(/\s+/g, "_");
  const fileName = `relacion_${arsName}_${doctorName}_${relacion.fecha}.xlsx`;

  return { buffer, fileName };
}

function respond(result) {
  if (result.error) return new Response(result.error, { status: result.status });
  return new Response(result.buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${result.fileName}"`,
    },
  });
}

export async function GET(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const result = await buildWorkbook(supabase, id, {});
  return respond(result);
}

export async function POST(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const overrides = await request.json().catch(() => ({}));
  const result = await buildWorkbook(supabase, id, overrides);
  return respond(result);
}
