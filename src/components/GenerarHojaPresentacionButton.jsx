"use client";

import { useState } from "react";

export default function GenerarHojaPresentacionButton({ relacionId, templates, comprobante }) {
  const [loading, setLoading] = useState(false);
  const [templateId, setTemplateId] = useState(templates?.[0]?.id || "");
  const [useComprobante, setUseComprobante] = useState(Boolean(comprobante));

  async function handleClick() {
    setLoading(true);

    const res = await fetch(`/api/relaciones/${relacionId}/hoja-presentacion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        template_id: templateId || null,
        comprobante_id: useComprobante ? comprobante?.id || null : null,
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
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex items-center gap-2">
        {templates?.length > 0 && (
          <select
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </select>
        )}
        <button
          onClick={handleClick}
          disabled={loading || templates?.length === 0}
          title={templates?.length === 0 ? "Crea una plantilla de hoja de presentación primero" : ""}
          className="text-xs text-brand-600 hover:underline disabled:text-slate-300 disabled:no-underline"
        >
          {loading ? "Generando..." : "Hoja de presentación"}
        </button>
      </div>
      {comprobante && (
        <label className="flex items-center gap-1 text-[11px] text-slate-500">
          <input
            type="checkbox"
            checked={useComprobante}
            onChange={(e) => setUseComprobante(e.target.checked)}
          />
          Usar NCF #{comprobante.numero}
        </label>
      )}
    </div>
  );
}
