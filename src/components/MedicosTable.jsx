"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import SearchInput from "@/components/SearchInput";

export default function MedicosTable({ doctors }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return doctors;
    return doctors.filter((d) => {
      const codigos = (d.doctor_ars_codigos || []).map((c) => c.codigo || "").join(" ");
      const haystack = `${d.nombre || ""} ${d.cedula || ""} ${d.especialidad || ""} ${codigos}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [doctors, q]);

  return (
    <>
      <SearchInput
        value={q}
        onChange={setQ}
        placeholder="Buscar por nombre, cédula o código de ARS..."
        className="mb-4 max-w-md"
      />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2">Nombre</th>
              <th className="px-4 py-2">Cédula</th>
              <th className="px-4 py-2">Especialidad</th>
              <th className="px-4 py-2">Centro médico</th>
              <th className="px-4 py-2">ARS</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => {
              const codigos = d.doctor_ars_codigos || [];
              const tooltip = codigos.map((c) => `${c.ars_catalog?.nombre}: ${c.codigo}`).join("\n");
              return (
                <tr key={d.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <Link href={`/medicos/${d.id}`} className="text-brand-600 hover:underline">
                      {d.nombre}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-slate-500">{d.cedula || "—"}</td>
                  <td className="px-4 py-2 text-slate-500">{d.especialidad || "—"}</td>
                  <td className="px-4 py-2 text-slate-500">{d.centro_medico || "—"}</td>
                  <td className="px-4 py-2">
                    {codigos.length > 0 ? (
                      <span
                        title={tooltip}
                        className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600"
                      >
                        {codigos.length} ARS
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">Sin código</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  {doctors.length === 0
                    ? "Aún no hay médicos cargados."
                    : "Ningún médico coincide con esa búsqueda."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
