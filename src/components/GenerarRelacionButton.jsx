"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function GenerarRelacionButton({
  arsId,
  doctorNombre,
  doctorCodigo,
  templates,
  comprobante,
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const defaultTemplate =
    templates?.find((t) => t.ars_id === arsId) || templates?.find((t) => !t.ars_id);
  const [templateId, setTemplateId] = useState(defaultTemplate?.id || "");
  const [useComprobante, setUseComprobante] = useState(Boolean(comprobante));

  async function handleClick() {
    setLoading(true);
    const res = await fetch("/api/relaciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ars_id: arsId,
        doctor_nombre: doctorNombre,
        doctor_codigo: doctorCodigo,
        template_id: templateId || null,
        comprobante_id: useComprobante ? comprobante?.id || null : null,
      }),
    });
    setLoading(false);

    if (res.ok) {
      router.refresh();
    } else {
      const { error } = await res.json();
      alert(error || "No se pudo generar la relación.");
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        {templates?.length > 0 && (
          <select
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            className="rounded-lg border border-slate-300 px-2 py-2 text-xs"
          >
            <option value="">Formato genérico (sin plantilla)</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </select>
        )}
        <button
          onClick={handleClick}
          disabled={loading}
          className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {loading ? "Generando..." : "Generar relación"}
        </button>
      </div>
      {comprobante && (
        <label className="flex items-center gap-1 text-xs text-slate-500">
          <input
            type="checkbox"
            checked={useComprobante}
            onChange={(e) => setUseComprobante(e.target.checked)}
          />
          Usar comprobante #{comprobante.numero}
        </label>
      )}
    </div>
  );
}
