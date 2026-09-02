"use client";

import Link from "next/link";
import { HEADER_FIELD_LABELS } from "@/lib/relacionFields";
import { sampleHeaderValue, sampleTableValue } from "@/lib/sampleData";

const SAMPLE_ROWS = [0, 1, 2];

export default function TemplatePreview({ template, canEdit }) {
  const isHoja = template.tipo === "hoja_presentacion";
  const headerFields = template.header_fields || [];
  const tableColumns = template.table_columns || [];
  const categorias = template.categorias || [];

  const totalField = tableColumns.some((c) => c.field === template.total_field)
    ? template.total_field
    : tableColumns[tableColumns.length - 1]?.field;

  const total = SAMPLE_ROWS.reduce(
    (sum, i) => sum + Number(sampleTableValue(totalField, i) || 0),
    0
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">{template.nombre}</h1>
          <p className="text-sm text-slate-500">
            {template.ars_catalog?.nombre || "Genérica"} ·{" "}
            {isHoja ? "Hoja de presentación" : "Relación"} — vista previa con datos de ejemplo
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href={`/api/templates/${template.id}/preview-export`}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Descargar en Excel
          </a>
          <button
            onClick={() => window.print()}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Imprimir
          </button>
          {canEdit && (
            <Link
              href={`/plantillas/${template.id}/editar`}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Editar
            </Link>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-6 text-sm print:border-0 print:shadow-none">
        {headerFields.map((hf) => (
          <div key={hf.field} className="mb-1 flex gap-2">
            <span className="font-semibold text-slate-800">
              {hf.label || HEADER_FIELD_LABELS[hf.field] || hf.field}:
            </span>
            <span className="text-slate-600">{sampleHeaderValue(hf.field)}</span>
          </div>
        ))}
        {headerFields.length === 0 && (
          <p className="text-slate-400">Este formato no tiene campos de encabezado configurados.</p>
        )}

        {!isHoja && (
          <>
            <p className="mb-2 mt-4 font-semibold text-slate-800">
              DETALLES DE LOS SERVICIOS PRESTADOS
            </p>
            {tableColumns.length === 0 ? (
              <p className="text-slate-400">Sin columnas de tabla configuradas.</p>
            ) : (
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr>
                    <th className="border border-slate-300 px-2 py-1">#</th>
                    {tableColumns.map((c) => (
                      <th key={c.field} className="border border-slate-300 px-2 py-1 text-left">
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SAMPLE_ROWS.map((i) => (
                    <tr key={i}>
                      <td className="border border-slate-300 px-2 py-1 text-center">{i + 1}</td>
                      {tableColumns.map((c) => (
                        <td key={c.field} className="border border-slate-300 px-2 py-1">
                          {sampleTableValue(c.field, i)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td
                      colSpan={Math.max(1, tableColumns.length)}
                      className="border border-slate-300 px-2 py-1 text-right font-semibold"
                    >
                      Total:
                    </td>
                    <td className="border border-slate-300 px-2 py-1 font-semibold">
                      {total.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </>
        )}

        {isHoja &&
          (categorias.length === 0 ? (
            <p className="mt-4 text-slate-400">Sin categorías de facturación configuradas.</p>
          ) : (
            <table className="mt-4 w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="border border-slate-300 px-2 py-1">CANTIDAD</th>
                  <th className="border border-slate-300 px-2 py-1 text-left">DESCRIPCION</th>
                  <th className="border border-slate-300 px-2 py-1">MONTO RD$</th>
                </tr>
              </thead>
              <tbody>
                {categorias.map((cat, i) => (
                  <tr key={i}>
                    <td className="border border-slate-300 px-2 py-1 text-center">{i + 2}</td>
                    <td className="border border-slate-300 px-2 py-1">{cat.label}</td>
                    <td className="border border-slate-300 px-2 py-1 text-right">
                      {((i + 1) * 1000).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2} className="border border-slate-300 px-2 py-1 text-right font-semibold">
                    Total RD$:
                  </td>
                  <td className="border border-slate-300 px-2 py-1 text-right font-semibold">
                    {(categorias.reduce((sum, _, i) => sum + (i + 1) * 1000, 0)).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          ))}
      </div>

      <p className="mt-3 text-center text-xs text-slate-400 print:hidden">
        Vista previa con datos de ejemplo — el archivo real usa los datos de
        la relación cuando lo generas desde /relaciones.
      </p>
    </div>
  );
}
