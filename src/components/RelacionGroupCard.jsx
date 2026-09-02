"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RelacionGroupCard({ entry, relacionTemplates }) {
  const router = useRouter();
  const [relacionId, setRelacionId] = useState(null);
  const [creating, setCreating] = useState(null); // null | "plantilla" | "hoja"
  const defaultTemplate =
    relacionTemplates?.find((t) => t.ars_id === entry.arsId) ||
    relacionTemplates?.find((t) => !t.ars_id);

  async function ensureRelacion() {
    if (relacionId) return relacionId;

    const res = await fetch("/api/relaciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ars_id: entry.arsId,
        doctor_id: entry.doctorId || null,
        doctor_nombre: entry.doctorNombre,
        doctor_codigo: entry.doctorCodigo,
        template_id: defaultTemplate?.id || null,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "No se pudo generar la relación.");
      return null;
    }
    setRelacionId(data.id);
    return data.id;
  }

  async function irA(destino) {
    setCreating(destino);
    const id = await ensureRelacion();
    setCreating(null);
    if (!id) return;
    router.push(`/relaciones/${id}/${destino}`);
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
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => irA("plantilla")}
            disabled={creating !== null}
            className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {creating === "plantilla" ? "Generando..." : "Ver plantilla de relación"}
          </button>
          <button
            onClick={() => irA("hoja")}
            disabled={creating !== null}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {creating === "hoja" ? "Generando..." : "Ver hoja de presentación"}
          </button>
        </div>
      )}
    </div>
  );
}
