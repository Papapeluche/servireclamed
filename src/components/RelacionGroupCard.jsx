"use client";

import { useState } from "react";
import HojaPresentacionPanel from "@/components/HojaPresentacionPanel";
import RelacionExportPanel from "@/components/RelacionExportPanel";

export default function RelacionGroupCard({ entry, relacionTemplates, hojaTemplates, comprobante }) {
  const [relacionId, setRelacionId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [showHojaPanel, setShowHojaPanel] = useState(false);
  const [showPlantillaPanel, setShowPlantillaPanel] = useState(false);
  const defaultTemplate =
    relacionTemplates?.find((t) => t.ars_id === entry.arsId) ||
    relacionTemplates?.find((t) => !t.ars_id);
  const [templateId, setTemplateId] = useState(defaultTemplate?.id || "");

  async function ensureRelacion() {
    if (relacionId) return relacionId;
    setCreating(true);

    const res = await fetch("/api/relaciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ars_id: entry.arsId,
        doctor_id: entry.doctorId || null,
        doctor_nombre: entry.doctorNombre,
        doctor_codigo: entry.doctorCodigo,
        template_id: templateId || null,
      }),
    });

    const data = await res.json();
    setCreating(false);

    if (!res.ok) {
      alert(data.error || "No se pudo generar la relación.");
      return null;
    }

    setRelacionId(data.id);
    return data.id;
  }

  async function handleConvertirPlantilla() {
    if (!relacionId) {
      const id = await ensureRelacion();
      if (!id) return;
    }
    setShowPlantillaPanel(true);
  }

  async function handleConvertirHoja() {
    if (!relacionId) {
      const id = await ensureRelacion();
      if (!id) return;
    }
    setShowHojaPanel(true);
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-start justify-between">
        <div>
          <p className="font-medium text-slate-900">{entry.ars?.nombre}</p>
          <p className="text-sm text-slate-600">
            {entry.doctorNombre || "(médico sin especificar)"}
          </p>
        </div>
        {relacionId && (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
            Relación generada
          </span>
        )}
      </div>

      <div className="mb-3 flex flex-wrap gap-3 text-xs text-slate-500">
        {entry.pendiente > 0 && <span>{entry.pendiente} pendiente(s)</span>}
        {entry.en_proceso > 0 && <span>{entry.en_proceso} en proceso</span>}
        <span className={entry.revisado > 0 ? "font-medium text-slate-700" : ""}>
          {entry.revisado} revisada(s) · RD$ {entry.totalRevisado.toFixed(2)}
        </span>
      </div>

      {entry.revisado === 0 ? (
        <p className="text-xs text-slate-400">
          Aún no hay reclamaciones revisadas en este grupo para convertir.
        </p>
      ) : (
        <>
          {relacionTemplates?.length > 1 && !relacionId && (
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="mb-2 w-full rounded-lg border border-slate-300 px-2 py-1 text-xs"
            >
              {relacionTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </select>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleConvertirPlantilla}
              disabled={creating}
              className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {creating ? "Generando..." : "Convertir en plantilla"}
            </button>
            <button
              onClick={handleConvertirHoja}
              disabled={creating}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Convertir en hoja de presentación
            </button>
          </div>

          {showPlantillaPanel && relacionId && (
            <div className="mt-2">
              <RelacionExportPanel
                relacionId={relacionId}
                templates={relacionTemplates}
                onClose={() => setShowPlantillaPanel(false)}
              />
            </div>
          )}

          {showHojaPanel && relacionId && (
            <div className="mt-2">
              <HojaPresentacionPanel
                relacionId={relacionId}
                templates={hojaTemplates}
                comprobante={comprobante}
                onClose={() => setShowHojaPanel(false)}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
