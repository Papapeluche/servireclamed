"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import SearchInput from "@/components/SearchInput";

export default function RelacionesHistorial({ relaciones }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return relaciones;
    return relaciones.filter((r) => {
      const haystack = `${r.ars_catalog?.nombre || ""} ${r.doctor_nombre || ""} ${r.doctor_codigo || ""} ${r.doctor_cedula || ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [relaciones, q]);

  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-4">
        <h2 className="text-sm font-semibold text-slate-700">Historial</h2>
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Buscar por ARS, médico, código o cédula..."
          className="max-w-xs"
        />
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2">ARS</th>
              <th className="px-4 py-2">Médico</th>
              <th className="px-4 py-2">Fecha</th>
              <th className="px-4 py-2">Total</th>
              <th className="px-4 py-2"></th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-4 py-2">
                  <Link href={`/relaciones/${r.id}`} className="text-brand-600 hover:underline">
                    {r.ars_catalog?.nombre}
                  </Link>
                </td>
                <td className="px-4 py-2">{r.doctor_nombre || "—"}</td>
                <td className="px-4 py-2 text-slate-500">{r.fecha}</td>
                <td className="px-4 py-2">RD$ {Number(r.total_monto).toFixed(2)}</td>
                <td className="px-4 py-2">
                  <Link href={`/relaciones/${r.id}/plantilla`} className="text-xs text-brand-600 hover:underline">
                    Ver plantilla
                  </Link>
                </td>
                <td className="px-4 py-2">
                  <Link href={`/relaciones/${r.id}/hoja`} className="text-xs text-brand-600 hover:underline">
                    Ver hoja de presentación
                  </Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  {relaciones.length === 0
                    ? "Aún no se ha convertido ninguna relación."
                    : "Ninguna relación coincide con esa búsqueda."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
