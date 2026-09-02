import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";
import {
  HEADER_FIELD_LABELS,
  DEFAULT_RELACION_HEADER_FIELDS,
  DEFAULT_RELACION_TABLE_COLUMNS,
  buildRelacionValues,
} from "@/lib/relacionFields";

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
      headerFields = template?.header_fields?.length
        ? template.header_fields
        : DEFAULT_RELACION_HEADER_FIELDS;
    }
    if (!tableColumns?.length) {
      tableColumns = template?.table_columns?.length
        ? template.table_columns
        : DEFAULT_RELACION_TABLE_COLUMNS;
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

  const relacionValues = buildRelacionValues(relacion);

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

  // Aviso (no bloqueante) de campos del encabezado que el formato pide pero
  // que este médico/ARS tiene vacíos en el catálogo — para que se note
  // antes de mandar el archivo, no después de que la ARS lo rechace.
  const missingFields = headerFields
    .filter((hf) => !relacionValues[hf.field])
    .map((hf) => hf.label || HEADER_FIELD_LABELS[hf.field] || hf.field);

  return { buffer, fileName, missingFields };
}

function respond(result) {
  if (result.error) return new Response(result.error, { status: result.status });
  const headers = {
    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": `attachment; filename="${result.fileName}"`,
  };
  if (result.missingFields?.length) {
    headers["X-Missing-Fields"] = encodeURIComponent(result.missingFields.join(", "));
  }
  return new Response(result.buffer, { headers });
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
