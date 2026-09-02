import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";

export async function GET(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: relacion, error: relacionError } = await supabase
    .from("relaciones")
    .select(
      "id, fecha, total_monto, doctor_nombre, doctor_cedula, doctor_codigo, especialidad, centro_medico, telefono_medico, ars_catalog(nombre)"
    )
    .eq("id", id)
    .single();

  if (relacionError || !relacion) {
    return new Response("Relación no encontrada", { status: 404 });
  }

  const { data: rows, error: rowsError } = await supabase
    .from("relacion_claims")
    .select("orden, claims(afiliado_nombre, no_carnet_nss, no_autorizacion, fecha_servicio, tipo_servicio, monto)")
    .eq("relacion_id", id)
    .order("orden");

  if (rowsError) {
    return new Response(rowsError.message, { status: 500 });
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Relación");
  sheet.columns = [{ width: 4 }, { width: 26 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 14 }];

  const bold = { font: { bold: true } };

  sheet.addRow([]);
  sheet.addRow([null, "Fecha:", relacion.fecha]);
  sheet.addRow([null, "Médico:", relacion.doctor_nombre || ""]);
  sheet.addRow([null, "Cédula:", relacion.doctor_cedula || ""]);
  sheet.addRow([null, "Código:", relacion.doctor_codigo || ""]);
  sheet.addRow([null, "Especialidad:", relacion.especialidad || ""]);
  sheet.addRow([null, "Centro:", relacion.centro_medico || ""]);
  sheet.addRow([null, "Teléfono:", relacion.telefono_medico || ""]);
  sheet.addRow([]);

  const tituloRow = sheet.addRow([null, "DETALLES DE LOS SERVICIOS PRESTADOS"]);
  tituloRow.getCell(2).font = bold.font;
  sheet.addRow([]);

  const headerRow = sheet.addRow([
    null,
    "Afiliado",
    "NSS contrato",
    "No. Autorización",
    "Fecha de Servicio",
    "Tipo de Servicio",
    "Valor RD$",
  ]);
  headerRow.font = bold.font;
  sheet.addRow([]);

  let total = 0;
  (rows || []).forEach((row, idx) => {
    const c = row.claims || {};
    total += Number(c.monto || 0);
    sheet.addRow([
      idx + 1,
      c.afiliado_nombre || "",
      c.no_carnet_nss || "",
      c.no_autorizacion || "",
      c.fecha_servicio || "",
      c.tipo_servicio || "",
      c.monto || 0,
    ]);
  });

  sheet.addRow([]);
  const totalRow = sheet.addRow([null, null, null, null, null, "Total:", total]);
  totalRow.font = bold.font;

  const buffer = await workbook.xlsx.writeBuffer();
  const arsName = relacion.ars_catalog?.nombre?.replace(/\s+/g, "_") || "ARS";
  const doctorName = (relacion.doctor_nombre || "sin_medico").replace(/\s+/g, "_");
  const fileName = `relacion_${arsName}_${doctorName}_${relacion.fecha}.xlsx`;

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
