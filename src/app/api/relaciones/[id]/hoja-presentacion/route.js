import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";
import {
  HEADER_FIELD_LABELS,
  DEFAULT_HOJA_HEADER_FIELDS,
  DEFAULT_HOJA_CATEGORIAS,
  buildRelacionValues,
} from "@/lib/relacionFields";
import { logAudit } from "@/lib/auth";

export async function POST(request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    template_id,
    comprobante_id,
    header_fields: headerFieldsOverride,
    categorias: categoriasOverride,
  } = await request.json().catch(() => ({}));

  const { data: relacion, error: relacionError } = await supabase
    .from("relaciones")
    .select(
      "id, fecha, total_monto, doctor_nombre, doctor_cedula, doctor_rnc, doctor_codigo, especialidad, centro_medico, telefono_medico, ars_id, ars_catalog(nombre, rnc)"
    )
    .eq("id", id)
    .single();

  if (relacionError || !relacion) {
    return new Response("Relación no encontrada", { status: 404 });
  }

  // El cliente normalmente ya manda header_fields/categorias filtrados (el
  // usuario puede desmarcar campos/categorías que no hagan falta esta vez).
  // Si no vienen, se cae a la plantilla guardada, y si tampoco hay
  // plantilla, a un layout genérico razonable.
  let headerFields = headerFieldsOverride;
  let categorias = categoriasOverride;

  if (!headerFields?.length || !categorias?.length) {
    let template = null;
    if (template_id) {
      const { data } = await supabase
        .from("export_templates")
        .select("header_fields, categorias")
        .eq("id", template_id)
        .eq("tipo", "hoja_presentacion")
        .single();
      template = data;
    }
    if (!template) {
      const { data } = await supabase
        .from("export_templates")
        .select("header_fields, categorias")
        .eq("tipo", "hoja_presentacion")
        .or(`ars_id.eq.${relacion.ars_id},ars_id.is.null`)
        .order("ars_id", { ascending: true, nullsFirst: false })
        .limit(1)
        .maybeSingle();
      template = data;
    }

    if (!headerFields?.length) {
      headerFields = template?.header_fields?.length
        ? template.header_fields
        : DEFAULT_HOJA_HEADER_FIELDS;
    }

    if (!categorias?.length) {
      categorias = template?.categorias?.length ? template.categorias : DEFAULT_HOJA_CATEGORIAS;
    }
  }

  const { data: rows, error: rowsError } = await supabase
    .from("relacion_claims")
    .select("claims(tipo_servicio, monto)")
    .eq("relacion_id", id);

  if (rowsError) {
    return new Response(rowsError.message, { status: 500 });
  }

  const claims = (rows || []).map((r) => r.claims).filter(Boolean);

  let comprobante = null;
  if (comprobante_id) {
    const { data: existing } = await supabase
      .from("comprobantes")
      .select("id, numero, vencimiento, estado")
      .eq("id", comprobante_id)
      .single();

    if (!existing || existing.estado !== "disponible") {
      return new Response("Ese comprobante ya no está disponible", { status: 409 });
    }

    const { error: updateError } = await supabase
      .from("comprobantes")
      .update({
        estado: "usado",
        ars_id: relacion.ars_id,
        monto: relacion.total_monto,
        relacion_id: relacion.id,
        used_at: new Date().toISOString(),
      })
      .eq("id", comprobante_id)
      .eq("estado", "disponible");

    if (updateError) {
      return new Response(updateError.message, { status: 500 });
    }
    comprobante = existing;
  }

  await supabase
    .from("relaciones")
    .update({ hoja_generada_at: new Date().toISOString() })
    .eq("id", id);

  await logAudit(supabase, {
    action: "HOJA_PRESENTACION_GENERADA",
    targetType: "relacion",
    targetId: id,
    details: {
      ars: relacion.ars_catalog?.nombre,
      doctor: relacion.doctor_nombre,
      total_monto: relacion.total_monto,
      ncf: comprobante?.numero || null,
    },
  });

  const relacionValues = buildRelacionValues(relacion, comprobante);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Hoja de presentación");
  sheet.columns = [{ width: 22 }, { width: 34 }, { width: 16 }];

  const bold = { bold: true };

  for (const hf of headerFields) {
    const label = hf.label || HEADER_FIELD_LABELS[hf.field] || hf.field;
    const row = sheet.addRow([`${label}:`, relacionValues[hf.field] ?? ""]);
    row.getCell(1).font = bold;
  }
  sheet.addRow([]);

  const tableHeaderRow = sheet.addRow(["CANTIDAD", "DESCRIPCION", "MONTO RD$"]);
  tableHeaderRow.font = bold;

  let total = 0;
  for (const cat of categorias) {
    const matching = cat.tipos?.length
      ? claims.filter((c) => cat.tipos.includes(c.tipo_servicio))
      : claims;
    const monto = matching.reduce((sum, c) => sum + Number(c.monto || 0), 0);
    total += monto;
    sheet.addRow([matching.length, cat.label, monto]);
  }

  sheet.addRow([]);
  const totalRow = sheet.addRow(["", "Total RD$", total]);
  totalRow.font = bold;

  const buffer = await workbook.xlsx.writeBuffer();
  const arsName = (relacion.ars_catalog?.nombre || "ARS").replace(/\s+/g, "_");
  const doctorName = (relacion.doctor_nombre || "sin_medico").replace(/\s+/g, "_");
  const fileName = `hoja_presentacion_${arsName}_${doctorName}_${relacion.fecha}.xlsx`;

  // Aviso (no bloqueante) de campos del encabezado que el formato pide pero
  // que este médico/ARS tiene vacíos en el catálogo — es la factura fiscal,
  // así que vale la pena que salte antes de mandarla a la ARS.
  const missingFields = headerFields
    .filter((hf) => !relacionValues[hf.field])
    .map((hf) => hf.label || HEADER_FIELD_LABELS[hf.field] || hf.field);

  const responseHeaders = {
    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": `attachment; filename="${fileName}"`,
  };
  if (missingFields.length) {
    responseHeaders["X-Missing-Fields"] = encodeURIComponent(missingFields.join(", "));
  }

  return new Response(buffer, {
    headers: responseHeaders,
  });
}
