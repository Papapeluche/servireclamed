"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CLAIM_STATUS_LABELS } from "@/lib/claimFields";
import BorrarReclamacionBoton from "@/components/BorrarReclamacionBoton";

// Mismo criterio que la política RLS: solo lo que aún no se ha revisado se
// puede borrar sin romper una relación ya armada.
const BORRABLES = ["pendiente", "en_proceso"];
const CONCURRENCIA = 4;

export default function ReclamacionesTabla({ filas }) {
  const router = useRouter();
  const [seleccion, setSeleccion] = useState(() => new Set());
  const [borrando, setBorrando] = useState(null); // { hechas, total }

  const borrables = useMemo(() => filas.filter((f) => BORRABLES.includes(f.status)), [filas]);
  // Si la lista cambia (auto-refresco, filtros), solo cuentan las que siguen visibles.
  const seleccionadas = borrables.filter((f) => seleccion.has(f.id));
  const todas = borrables.length > 0 && seleccionadas.length === borrables.length;

  function alternar(id) {
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function alternarTodas() {
    setSeleccion(todas ? new Set() : new Set(borrables.map((f) => f.id)));
  }

  async function borrarSeleccionadas() {
    const total = seleccionadas.length;
    if (!confirm(`¿Eliminar ${total} reclamación(es)? Se borran junto con sus fotos y no se puede deshacer.`)) return;

    setBorrando({ hechas: 0, total });
    const fallidas = [];
    const cola = [...seleccionadas];
    let hechas = 0;
    async function trabajador() {
      while (cola.length) {
        const f = cola.shift();
        const res = await fetch(`/api/claims/${f.id}`, { method: "DELETE" }).catch(() => null);
        if (!res?.ok) {
          const data = await res?.json().catch(() => ({}));
          fallidas.push(`${f.afiliado_nombre || "(sin nombre)"}: ${data?.error || "error de conexión"}`);
        }
        setBorrando({ hechas: ++hechas, total });
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCIA, total) }, trabajador));

    setBorrando(null);
    setSeleccion(new Set());
    if (fallidas.length) {
      alert(`Se eliminaron ${total - fallidas.length} de ${total}. No se pudieron eliminar:\n\n${fallidas.join("\n")}`);
    }
    router.refresh();
  }

  return (
    <div>
      {seleccionadas.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm">
          <span className="font-medium text-red-800">{seleccionadas.length} seleccionada(s)</span>
          <button
            onClick={borrarSeleccionadas}
            disabled={Boolean(borrando)}
            className="rounded-lg bg-red-600 px-3 py-1.5 font-medium text-white hover:bg-red-700 disabled:opacity-60"
          >
            {borrando ? `Eliminando ${borrando.hechas} de ${borrando.total}...` : "Eliminar seleccionadas"}
          </button>
          <button
            onClick={() => setSeleccion(new Set())}
            disabled={Boolean(borrando)}
            className="text-slate-600 hover:underline disabled:opacity-60"
          >
            Quitar selección
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="w-10 px-4 py-2">
                {borrables.length > 0 && (
                  <input
                    type="checkbox"
                    checked={todas}
                    onChange={alternarTodas}
                    aria-label="Seleccionar todas las que se pueden eliminar"
                    title="Seleccionar todas las que se pueden eliminar"
                  />
                )}
              </th>
              <th className="px-4 py-2">Paciente</th>
              <th className="px-4 py-2">ARS</th>
              <th className="px-4 py-2">Monto</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2">Por</th>
              <th className="px-4 py-2">Fecha</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filas.map((c) => {
              const borrable = BORRABLES.includes(c.status);
              return (
                <tr
                  key={c.id}
                  className={`border-t border-slate-100 ${seleccion.has(c.id) && borrable ? "bg-red-50/60" : "hover:bg-slate-50"}`}
                >
                  <td className="px-4 py-2">
                    {borrable && (
                      <input
                        type="checkbox"
                        checked={seleccion.has(c.id)}
                        onChange={() => alternar(c.id)}
                        aria-label={`Seleccionar ${c.afiliado_nombre || "reclamación sin nombre"}`}
                      />
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <Link href={`/reclamaciones/${c.id}`} className="text-brand-600 hover:underline">
                      {c.afiliado_nombre || "(sin nombre aún)"}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{c.ars || "—"}</td>
                  <td className="px-4 py-2">{c.monto ? `RD$ ${c.monto}` : "—"}</td>
                  <td className="px-4 py-2">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-4 py-2 text-slate-500">{c.por || "—"}</td>
                  <td className="px-4 py-2 text-slate-500">{c.fecha}</td>
                  <td className="px-4 py-2 text-right">
                    {borrable && <BorrarReclamacionBoton claimId={c.id} nombre={c.afiliado_nombre} />}
                  </td>
                </tr>
              );
            })}
            {filas.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                  Aún no hay reclamaciones capturadas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    pendiente: "bg-warn-100 text-warn-700",
    en_proceso: "bg-blue-100 text-blue-700",
    revisado: "bg-emerald-100 text-emerald-700",
    en_relacion: "bg-indigo-100 text-indigo-700",
    enviado: "bg-slate-200 text-slate-700",
    rechazado: "bg-red-100 text-red-700",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] || ""}`}>
      {CLAIM_STATUS_LABELS[status] || status}
    </span>
  );
}
