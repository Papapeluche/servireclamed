"use client";

import { useState } from "react";

export default function HojaPresentacionPanel({ relacionId, templates, comprobante, onClose }) {
  const [loading, setLoading] = useState(false);
  const [templateId, setTemplateId] = useState(templates?.[0]?.id || "");
  const [useComprobante, setUseComprobante] = useState(Boolean(comprobante));
  const [selectedHeaderFields, setSelectedHeaderFields] = useState(
    () => new Set((templates?.[0]?.header_fields || []).map((f) => f.field))
  );
  const [selectedCategorias, setSelectedCategorias] = useState(
    () => new Set((templates?.[0]?.categorias || []).map((c) => c.label))
  );

  const template = templates?.find((t) => t.id === templateId);

  function changeTemplate(id) {
    setTemplateId(id);
    const tpl = templates?.find((t) => t.id === id);
    setSelectedHeaderFields(new Set((tpl?.header_fields || []).map((f) => f.field)));
    setSelectedCategorias(new Set((tpl?.categorias || []).map((c) => c.label)));
  }

  function toggleHeaderField(field) {
    setSelectedHeaderFields((prev) => {
      const next = new Set(prev);
      next.has(field) ? next.delete(field) : next.add(field);
      return next;
    });
  }

  function toggleCategoria(label) {
    setSelectedCategorias((prev) => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  }

  async function handleGenerate() {
    if (!template) return;
    setLoading(true);

    const header_fields = template.header_fields.filter((f) => selectedHeaderFields.has(f.field));
    const categorias = template.categorias.filter((c) => selectedCategorias.has(c.label));

    const res = await fetch(`/api/relaciones/${relacionId}/hoja-presentacion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        header_fields,
        categorias,
        comprobante_id: useComprobante ? comprobante?.id || null : null,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const text = await res.text();
      alert(text || "No se pudo generar la hoja de presentación.");
      return;
    }

    const missing = res.headers.get("X-Missing-Fields");

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

    if (missing) {
      alert(
        `Se descargó, pero al médico o la ARS le faltan estos datos que el formato pide: ${decodeURIComponent(missing)}. Complétalos en la ficha del médico o de la ARS.`
      );
    }

    onClose?.();
  }

  if (!templates || templates.length === 0) {
    return <p className="text-xs text-slate-400">No hay plantilla de hoja de presentación.</p>;
  }

  return (
    <div className="w-64 rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-sm">
      {templates.length > 1 && (
        <select
          value={templateId}
          onChange={(e) => changeTemplate(e.target.value)}
          className="mb-2 w-full rounded border border-slate-300 px-2 py-1 text-xs"
        >
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nombre}
            </option>
          ))}
        </select>
      )}

      <p className="mb-1 font-medium text-slate-700">Campos del encabezado</p>
      <div className="mb-2 flex flex-col gap-1">
        {template?.header_fields.map((f) => (
          <label key={f.field} className="flex items-center gap-1 text-slate-600">
            <input
              type="checkbox"
              checked={selectedHeaderFields.has(f.field)}
              onChange={() => toggleHeaderField(f.field)}
            />
            {f.label}
          </label>
        ))}
      </div>

      <p className="mb-1 font-medium text-slate-700">Categorías</p>
      <div className="mb-2 flex flex-col gap-1">
        {template?.categorias.map((c) => (
          <label key={c.label} className="flex items-center gap-1 text-slate-600">
            <input
              type="checkbox"
              checked={selectedCategorias.has(c.label)}
              onChange={() => toggleCategoria(c.label)}
            />
            {c.label}
          </label>
        ))}
      </div>

      {comprobante && (
        <label className="mb-2 flex items-center gap-1 text-slate-600">
          <input
            type="checkbox"
            checked={useComprobante}
            onChange={(e) => setUseComprobante(e.target.checked)}
          />
          Usar NCF #{comprobante.numero}
        </label>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleGenerate}
          disabled={loading || selectedCategorias.size === 0}
          className="rounded bg-brand-600 px-2 py-1 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {loading ? "Generando..." : "Generar"}
        </button>
        <button
          onClick={onClose}
          className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
