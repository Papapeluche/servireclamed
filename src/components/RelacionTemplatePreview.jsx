"use client";

import { useMemo, useState } from "react";
import { ALL_FIELD_NAMES, FIELD_BY_NAME } from "@/lib/claimFields";
import { HEADER_FIELD_OPTIONS, HEADER_FIELD_LABELS } from "@/lib/relacionFields";
import { FieldListEditor } from "@/components/TemplateEditor";

const TABLE_FIELD_OPTIONS = ALL_FIELD_NAMES.map((name) => ({
  field: name,
  label: FIELD_BY_NAME[name].label,
}));

// Vista previa con los datos REALES de la relación (a diferencia de
// TemplatePreview.jsx, que usa datos de ejemplo solo para mostrar el
// formato en /plantillas). Desde aquí se descarga, se imprime, o se
// ajustan los campos para esta descarga puntual.
export default function RelacionTemplatePreview({
  relacionId,
  relacionValues,
  claims,
  templates,
  defaultHeaderFields,
  defaultTableColumns,
}) {
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const defaultTemplate = templates?.[0];
  const [templateId, setTemplateId] = useState(defaultTemplate?.id || "");
  const [headerFields, setHeaderFields] = useState(
    () => (defaultTemplate?.header_fields?.length ? defaultTemplate.header_fields : defaultHeaderFields)
  );
  const [tableColumns, setTableColumns] = useState(
    () => (defaultTemplate?.table_columns?.length ? defaultTemplate.table_columns : defaultTableColumns)
  );

  function changeTemplate(id) {
    setTemplateId(id);
    const tpl = templates?.find((t) => t.id === id);
    setHeaderFields(tpl?.header_fields?.length ? tpl.header_fields : defaultHeaderFields);
    setTableColumns(tpl?.table_columns?.length ? tpl.table_columns : defaultTableColumns);
  }

  const total = useMemo(
    () => claims.reduce((sum, c) => sum + Number(c.monto || 0), 0),
    [claims]
  );

  const missingFields = useMemo(
    () => headerFields.filter((hf) => !relacionValues[hf.field]),
    [headerFields, relacionValues]
  );

  async function handleDescargar() {
    setLoading(true);
    const res = await fetch(`/api/relaciones/${relacionId}/export`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ header_fields: headerFields, table_columns: tableColumns }),
    });
    setLoading(false);

    if (!res.ok) {
      const text = await res.text();
      alert(text || "No se pudo generar la relación.");
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const disposition = res.headers.get("Content-Disposition") || "";
    const match = disposition.match(/filename="(.+)"/);
    a.download = match ? match[1] : "relacion.xlsx";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Plantilla de relación</h1>
          {templates?.length > 1 && (
            <select
              value={templateId}
              onChange={(e) => changeTemplate(e.target.value)}
              className="mt-1 rounded-lg border border-slate-300 px-2 py-1 text-sm"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleDescargar}
            disabled={loading || tableColumns.length === 0}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {loading ? "Generando..." : "Descargar en Excel"}
          </button>
          <button
            onClick={() => window.print()}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Imprimir
          </button>
          <button
            onClick={() => setEditMode((v) => !v)}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {editMode ? "Cerrar edición" : "Editar campos"}
          </button>
        </div>
      </div>

      {missingFields.length > 0 && (
        <div className="mb-4 rounded-lg bg-warn-100 px-3 py-2 text-sm text-warn-700 print:hidden">
          Al médico o la ARS le faltan estos datos que este formato pide:{" "}
          {missingFields
            .map((hf) => hf.label || HEADER_FIELD_LABELS[hf.field] || hf.field)
            .join(", ")}
          . Complétalos en la ficha del médico o de la ARS antes de enviar el documento.
        </div>
      )}

      {editMode && (
        <div className="mb-4 print:hidden">
          <p className="mb-3 text-xs text-slate-500">
            Estos cambios son solo para esta descarga — no tocan el formato
            guardado en /plantillas.
          </p>
          <FieldListEditor
            title="Campos del encabezado"
            options={HEADER_FIELD_OPTIONS}
            chosen={headerFields}
            onChange={setHeaderFields}
          />
          <FieldListEditor
            title="Columnas de la tabla"
            options={TABLE_FIELD_OPTIONS}
            chosen={tableColumns}
            onChange={setTableColumns}
          />
        </div>
      )}

      <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-6 text-sm print:border-0 print:shadow-none">
        {headerFields.map((hf) => (
          <div key={hf.field} className="mb-1 flex gap-2">
            <span className="font-semibold text-slate-800">
              {hf.label || HEADER_FIELD_LABELS[hf.field] || hf.field}:
            </span>
            <span className="text-slate-600">{relacionValues[hf.field] || "—"}</span>
          </div>
        ))}
        {headerFields.length === 0 && (
          <p className="text-slate-400">Este formato no tiene campos de encabezado configurados.</p>
        )}

        <p className="mb-2 mt-4 font-semibold text-slate-800">DETALLES DE LOS SERVICIOS PRESTADOS</p>
        {tableColumns.length === 0 ? (
          <p className="text-slate-400">Sin columnas de tabla configuradas.</p>
        ) : (
          <div className="overflow-x-auto">
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
                {claims.map((c, i) => (
                  <tr key={c.id}>
                    <td className="border border-slate-300 px-2 py-1 text-center">{i + 1}</td>
                    {tableColumns.map((col) => (
                      <td key={col.field} className="border border-slate-300 px-2 py-1">
                        {c[col.field] ?? ""}
                      </td>
                    ))}
                  </tr>
                ))}
                {claims.length === 0 && (
                  <tr>
                    <td
                      colSpan={tableColumns.length + 1}
                      className="border border-slate-300 px-2 py-4 text-center text-slate-400"
                    >
                      Sin reclamaciones en esta relación.
                    </td>
                  </tr>
                )}
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
          </div>
        )}
      </div>
    </div>
  );
}
