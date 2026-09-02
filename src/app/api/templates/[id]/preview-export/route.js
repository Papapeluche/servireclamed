import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";
import { HEADER_FIELD_LABELS } from "@/lib/relacionFields";
import { sampleHeaderValue, sampleTableValue } from "@/lib/sampleData";

const SAMPLE_ROWS = [0, 1, 2];

// Genera el mismo archivo que descargarían al usar este formato, pero con
// datos de ejemplo — una plantilla sola no está ligada a ninguna relación
// real. Usa las mismas funciones de datos de muestra que la vista previa en
// pantalla (src/lib/sampleData.js), para que ambas coincidan.
export async function GET(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: template, error } = await supabase
    .from("export_templates")
    .select("*, ars_catalog(nombre)")
    .eq("id", id)
    .single();

  if (error || !template) {
    return new Response("Plantilla no encontrada", { status: 404 });
  }

  const headerFields = template.header_fields || [];
  const workbook = new ExcelJS.Workbook();
  const bold = { bold: true };

  if (template.tipo === "hoja_presentacion") {
    const categorias = template.categorias || [];
    const sheet = workbook.addWorksheet("Hoja de presentación (ejemplo)");
    sheet.columns = [{ width: 22 }, { width: 34 }, { width: 16 }];

    for (const hf of headerFields) {
      const label = hf.label || HEADER_FIELD_LABELS[hf.field] || hf.field;
      const row = sheet.addRow([`${label}:`, sampleHeaderValue(hf.field)]);
      row.getCell(1).font = bold;
    }
    sheet.addRow([]);

    const tableHeaderRow = sheet.addRow(["CANTIDAD", "DESCRIPCION", "MONTO RD$"]);
    tableHeaderRow.font = bold;

    let total = 0;
    categorias.forEach((cat, i) => {
      const monto = (i + 1) * 1000;
      total += monto;
      sheet.addRow([i + 2, cat.label, monto]);
    });

    sheet.addRow([]);
    const totalRow = sheet.addRow(["", "Total RD$", total]);
    totalRow.font = bold;
  } else {
    const tableColumns = template.table_columns || [];
    const totalField = tableColumns.some((c) => c.field === template.total_field)
      ? template.total_field
      : tableColumns[tableColumns.length - 1]?.field;

    const sheet = workbook.addWorksheet("Relación (ejemplo)");
    sheet.columns = [{ width: 4 }, ...tableColumns.map(() => ({ width: 20 }))];

    sheet.addRow([]);
    for (const hf of headerFields) {
      const label = hf.label || HEADER_FIELD_LABELS[hf.field] || hf.field;
      sheet.addRow([null, `${label}:`, sampleHeaderValue(hf.field)]);
    }
    sheet.addRow([]);

    const tituloRow = sheet.addRow([null, "DETALLES DE LOS SERVICIOS PRESTADOS"]);
    tituloRow.getCell(2).font = bold;
    sheet.addRow([]);

    const headerRow = sheet.addRow([null, ...tableColumns.map((c) => c.label)]);
    headerRow.font = bold;
    sheet.addRow([]);

    let total = 0;
    SAMPLE_ROWS.forEach((i) => {
      total += Number(sampleTableValue(totalField, i) || 0);
      sheet.addRow([i + 1, ...tableColumns.map((col) => sampleTableValue(col.field, i))]);
    });

    sheet.addRow([]);
    const totalLabelCol = Math.max(1, tableColumns.length - 1);
    const totalRowValues = new Array(tableColumns.length + 1).fill(null);
    totalRowValues[totalLabelCol] = "Total:";
    totalRowValues[tableColumns.length] = total;
    const totalRow = sheet.addRow(totalRowValues);
    totalRow.font = bold;
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = `ejemplo_${(template.nombre || "plantilla").replace(/\s+/g, "_")}.xlsx`;

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
