import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";

export async function GET(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: relacion, error: relacionError } = await supabase
    .from("relaciones")
    .select("id, fecha, total_monto, ars_catalog(nombre)")
    .eq("id", id)
    .single();

  if (relacionError || !relacion) {
    return new Response("Relación no encontrada", { status: 404 });
  }

  const { data: rows, error: rowsError } = await supabase
    .from("relacion_claims")
    .select(
      "orden, claims(paciente_nombre, paciente_cedula, afiliado_nombre, afiliado_no_afiliado, doctor_nombre, fecha_servicio, codigo_servicio, descripcion_servicio, diagnostico_codigo, no_factura, monto_reclamado)"
    )
    .eq("relacion_id", id)
    .order("orden");

  if (rowsError) {
    return new Response(rowsError.message, { status: 500 });
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Relación");

  sheet.columns = [
    { header: "#", key: "orden", width: 5 },
    { header: "Paciente", key: "paciente_nombre", width: 25 },
    { header: "Cédula paciente", key: "paciente_cedula", width: 16 },
    { header: "Afiliado", key: "afiliado_nombre", width: 25 },
    { header: "No. afiliado", key: "afiliado_no_afiliado", width: 16 },
    { header: "Médico", key: "doctor_nombre", width: 25 },
    { header: "Fecha servicio", key: "fecha_servicio", width: 14 },
    { header: "Código servicio", key: "codigo_servicio", width: 16 },
    { header: "Descripción servicio", key: "descripcion_servicio", width: 30 },
    { header: "Diagnóstico (CIE-10)", key: "diagnostico_codigo", width: 16 },
    { header: "No. factura", key: "no_factura", width: 14 },
    { header: "Monto (RD$)", key: "monto_reclamado", width: 14 },
  ];
  sheet.getRow(1).font = { bold: true };

  (rows || []).forEach((row, idx) => {
    sheet.addRow({ orden: idx + 1, ...row.claims });
  });

  sheet.addRow({});
  const totalRow = sheet.addRow({
    descripcion_servicio: "TOTAL",
    monto_reclamado: relacion.total_monto,
  });
  totalRow.font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  const arsName = relacion.ars_catalog?.nombre?.replace(/\s+/g, "_") || "ARS";
  const fileName = `relacion_${arsName}_${relacion.fecha}.xlsx`;

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
