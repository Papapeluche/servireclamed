"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { HEADER_FIELD_OPTIONS, HEADER_FIELD_LABELS } from "@/lib/relacionFields";
import { FieldListEditor } from "@/components/TemplateEditor";

// Vista previa con los datos REALES de la relación, análoga a
// RelacionTemplatePreview.jsx pero para la hoja de presentación (que se
// agrupa por categoría de servicio, no fila por fila). Descargar aquí sí
// tiene efecto real (puede consumir un comprobante/NCF), así que se avisa
// antes de hacerlo.
export default function HojaPresentacionPreview({
  relacionId,
  relacionValues,
  claims,
  templates,
  comprobanteUsado,
  comprobanteDisponible,
  defaultHeaderFields,
  defaultCategorias,
}) {
  const router = useRouter();
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const defaultTemplate = templates?.[0];
  const [templateId, setTemplateId] = useState(defaultTemplate?.id || "");
  const [headerFields, setHeaderFields] = useState(
    () => (defaultTemplate?.header_fields?.length ? defaultTemplate.header_fields : defaultHeaderFields)
  );
  const [allCategorias, setAllCategorias] = useState(
    () => (defaultTemplate?.categorias?.length ? defaultTemplate.categorias : defaultCategorias)
  );
  const [selectedLabels, setSelectedLabels] = useState(
    () => new Set((defaultTemplate?.categorias?.length ? defaultTemplate.categorias : defaultCategorias).map((c) => c.label))
  );
  const [useComprobante, setUseComprobante] = useState(
    !comprobanteUsado && Boolean(comprobanteDisponible)
  );

  function changeTemplate(id) {
    setTemplateId(id);
    const tpl = templates?.find((t) => t.id === id);
    const categorias = tpl?.categorias?.length ? tpl.categorias : defaultCategorias;
    setHeaderFields(tpl?.header_fields?.length ? tpl.header_fields : defaultHeaderFields);
    setAllCategorias(categorias);
    setSelectedLabels(new Set(categorias.map((c) => c.label)));
  }

  function toggleCategoria(label) {
    setSelectedLabels((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  const categorias = useMemo(
    () => allCategorias.filter((c) => selectedLabels.has(c.label)),
    [allCategorias, selectedLabels]
  );

  const rows = useMemo(
    () =>
      categorias.map((cat) => {
        const matching = cat.tipos?.length
          ? claims.filter((c) => cat.tipos.includes(c.tipo_servicio))
          : claims;
        const monto = matching.reduce((sum, c) => sum + Number(c.monto || 0), 0);
        return { label: cat.label, cantidad: matching.length, monto };
      }),
    [categorias, claims]
  );

  const total = rows.reduce((sum, r) => sum + r.monto, 0);

  const effectiveValues = {
    ...relacionValues,
    ncf: comprobanteUsado?.numero || (useComprobante ? comprobanteDisponible?.numero : "") || "",
    ncf_vencimiento:
      comprobanteUsado?.vencimiento || (useComprobante ? comprobanteDisponible?.vencimiento : "") || "",
  };

  const missingFields = useMemo(
    () => headerFields.filter((hf) => !effectiveValues[hf.field]),
    [headerFields, effectiveValues]
  );

  async function handleDescargar() {
    if (!comprobanteUsado && useComprobante && comprobanteDisponible) {
      const ok = confirm(
        `Esto va a consumir el comprobante (NCF) #${comprobanteDisponible.numero} para esta hoja de presentación. ¿Continuar?`
      );
      if (!ok) return;
    }

    setLoading(true);
    const res = await fetch(`/api/relaciones/${relacionId}/hoja-presentacion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        header_fields: headerFields,
        categorias,
        comprobante_id: !comprobanteUsado && useComprobante ? comprobanteDisponible?.id || null : null,
      }),
    });
    setLoading(false);

    if (!res.ok) {
      const text = await res.text();
      alert(text || "No se pudo generar la hoja de presentación.");
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const disposition = res.headers.get("Content-Disposition") || "";
    const match = disposition.match(/filename="(.+)"/);
    a.download = match ? match[1] : "hoja_presentacion.xlsx";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    // Si se consumió un comprobante, refleja el cambio (ya no aparece
    // disponible para volver a usarlo por error).
    if (!comprobanteUsado && useComprobante) router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Hoja de presentación</h1>
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
            disabled={loading || categorias.length === 0}
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
          . Es la factura fiscal — complétalos antes de mandarla a la ARS.
        </div>
      )}

      {comprobanteUsado ? (
        <p className="mb-4 text-xs text-slate-500 print:hidden">
          Ya se generó con el comprobante (NCF) #{comprobanteUsado.numero}.
        </p>
      ) : comprobanteDisponible ? (
        <label className="mb-4 flex items-center gap-2 text-sm text-slate-700 print:hidden">
          <input
            type="checkbox"
            checked={useComprobante}
            onChange={(e) => setUseComprobante(e.target.checked)}
          />
          Usar el comprobante (NCF) #{comprobanteDisponible.numero} disponible para este médico
        </label>
      ) : (
        <p className="mb-4 text-xs text-slate-400 print:hidden">
          No hay comprobantes (NCF) disponibles asignados a este médico — se generará sin NCF.
        </p>
      )}

      {editMode && (
        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 print:hidden">
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
          <p className="mb-2 text-sm font-semibold text-slate-800">Categorías</p>
          <div className="flex flex-col gap-1">
            {allCategorias.map((c) => (
              <label key={c.label} className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={selectedLabels.has(c.label)}
                  onChange={() => toggleCategoria(c.label)}
                />
                {c.label}
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-6 text-sm print:border-0 print:shadow-none">
        {headerFields.map((hf) => (
          <div key={hf.field} className="mb-1 flex gap-2">
            <span className="font-semibold text-slate-800">
              {hf.label || HEADER_FIELD_LABELS[hf.field] || hf.field}:
            </span>
            <span className="text-slate-600">{effectiveValues[hf.field] || "—"}</span>
          </div>
        ))}
        {headerFields.length === 0 && (
          <p className="text-slate-400">Este formato no tiene campos de encabezado configurados.</p>
        )}

        {categorias.length === 0 ? (
          <p className="mt-4 text-slate-400">Sin categorías seleccionadas.</p>
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
              {rows.map((r) => (
                <tr key={r.label}>
                  <td className="border border-slate-300 px-2 py-1 text-center">{r.cantidad}</td>
                  <td className="border border-slate-300 px-2 py-1">{r.label}</td>
                  <td className="border border-slate-300 px-2 py-1 text-right">{r.monto.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2} className="border border-slate-300 px-2 py-1 text-right font-semibold">
                  Total RD$:
                </td>
                <td className="border border-slate-300 px-2 py-1 text-right font-semibold">
                  {total.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
