"use client";

import { useMemo, useState } from "react";
import SearchInput from "@/components/SearchInput";
import AnularComprobanteButton from "@/components/AnularComprobanteButton";

const ESTADO_LABELS = {
  disponible: "Disponible",
  usado: "Usado",
  anulado: "Anulado",
};

const ESTADO_STYLES = {
  disponible: "bg-emerald-100 text-emerald-700",
  usado: "bg-slate-200 text-slate-700",
  anulado: "bg-red-100 text-red-700",
};

export default function ComprobantesTable({ comprobantes, profilesMap = {}, canManage = true }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return comprobantes;
    return comprobantes.filter((c) => {
      const haystack = `${c.numero || ""} ${c.doctors?.nombre || ""} ${c.ars_catalog?.nombre || ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [comprobantes, q]);

  return (
    <>
      <SearchInput
        value={q}
        onChange={setQ}
        placeholder="Buscar por número, médico o ARS..."
        className="mb-4 max-w-md"
      />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2">Número</th>
              <th className="px-4 py-2">Médico</th>
              <th className="px-4 py-2">Vence</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2">ARS usado</th>
              <th className="px-4 py-2">Monto</th>
              <th className="px-4 py-2">Fecha de uso</th>
              <th className="px-4 py-2">Asignado por</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="px-4 py-2 font-mono text-xs">{c.numero}</td>
                <td className="px-4 py-2">{c.doctors?.nombre || "—"}</td>
                <td className="px-4 py-2 text-slate-500">{c.vencimiento || "—"}</td>
                <td className="px-4 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ESTADO_STYLES[c.estado]}`}>
                    {ESTADO_LABELS[c.estado]}
                  </span>
                </td>
                <td className="px-4 py-2 text-slate-500">{c.ars_catalog?.nombre || "—"}</td>
                <td className="px-4 py-2 text-slate-500">
                  {c.monto ? `RD$ ${Number(c.monto).toFixed(2)}` : "—"}
                </td>
                <td className="px-4 py-2 text-slate-500">
                  {c.used_at ? new Date(c.used_at).toLocaleDateString("es-DO") : "—"}
                </td>
                <td className="px-4 py-2 text-slate-500">{profilesMap[c.created_by] || "—"}</td>
                <td className="px-4 py-2">
                  {c.estado === "disponible" && canManage && <AnularComprobanteButton id={c.id} />}
                  {c.estado === "usado" && c.relaciones?.id && (
                    <a
                      href={`/relaciones/${c.relaciones.id}`}
                      className="text-xs text-brand-600 hover:underline"
                    >
                      Ver relación
                    </a>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                  {comprobantes.length === 0
                    ? "Aún no hay comprobantes asignados."
                    : "Ningún comprobante coincide con esa búsqueda."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
