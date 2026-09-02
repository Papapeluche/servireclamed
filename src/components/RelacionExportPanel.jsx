"use client";

import { useState } from "react";
import { ALL_FIELD_NAMES, FIELD_BY_NAME } from "@/lib/claimFields";
import { HEADER_FIELD_OPTIONS } from "@/lib/relacionFields";
import { FieldListEditor } from "@/components/TemplateEditor";

const TABLE_FIELD_OPTIONS = ALL_FIELD_NAMES.map((name) => ({
  field: name,
  label: FIELD_BY_NAME[name].label,
}));

export default function RelacionExportPanel({ relacionId, templates, onClose }) {
  const [loading, setLoading] = useState(false);
  const [templateId, setTemplateId] = useState(templates?.[0]?.id || "");
  const template = templates?.find((t) => t.id === templateId) || templates?.[0];

  const [headerFields, setHeaderFields] = useState(() => template?.header_fields || []);
  const [tableColumns, setTableColumns] = useState(() => template?.table_columns || []);

  function changeTemplate(id) {
    setTemplateId(id);
    const tpl = templates?.find((t) => t.id === id);
    setHeaderFields(tpl?.header_fields || []);
    setTableColumns(tpl?.table_columns || []);
  }

  async function handleGenerate() {
    setLoading(true);

    const res = await fetch(`/api/relaciones/${relacionId}/export`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ header_fields: headerFields, table_columns: tableColumns }),
    });

    setLoading(false);

    if (!res.ok) {
      const text = await res.text();
      alert(text || "No se pudo generar la plantilla.");
      return;
    }

    const missing = res.headers.get("X-Missing-Fields");

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

    if (missing) {
      alert(
        `Se descargó, pero al médico o la ARS le faltan estos datos que el formato pide: ${decodeURIComponent(missing)}. Complétalos en la ficha del médico o de la ARS.`
      );
    }

    onClose?.();
  }

  if (!templates || templates.length === 0) {
    return <p className="text-xs text-slate-400">No hay plantilla de relación.</p>;
  }

  return (
    <div className="w-80 rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-sm">
      {templates.length > 1 && (
        <select
          value={templateId}
          onChange={(e) => changeTemplate(e.target.value)}
          className="mb-3 w-full rounded border border-slate-300 px-2 py-1 text-xs"
        >
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nombre}
            </option>
          ))}
        </select>
      )}

      <p className="mb-2 text-slate-500">
        Además de los campos del formato, puedes agregar aquí cualquier otro
        dato que ya se digitó de estas reclamaciones (diagnóstico, edad,
        empleador, etc.) — solo para esta descarga, sin tocar el formato
        guardado.
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

      <div className="flex gap-2">
        <button
          onClick={handleGenerate}
          disabled={loading || tableColumns.length === 0}
          className="rounded bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {loading ? "Generando..." : "Descargar"}
        </button>
        <button
          onClick={onClose}
          className="rounded border border-slate-300 px-3 py-1.5 text-xs hover:bg-slate-50"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
