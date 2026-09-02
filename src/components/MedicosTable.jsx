"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import SearchInput from "@/components/SearchInput";

export default function MedicosTable({ doctors }) {
  const [q, setQ] = useState("");
  const [selectedCentro, setSelectedCentro] = useState("");

  // Agrupa por centro médico normalizado (sin espacios/mayúsculas) para que
  // "Clínica Abreu" y "clinica abreu " no salgan como dos centros distintos
  // — el dato es texto libre digitado por distintas personas. El nombre que
  // se muestra es el primero que se vio con esa forma normalizada.
  const centros = useMemo(() => {
    const map = new Map();
    let sinCentro = 0;
    for (const d of doctors) {
      const raw = (d.centro_medico || "").trim();
      if (!raw) {
        sinCentro += 1;
        continue;
      }
      const key = raw.toLowerCase();
      if (!map.has(key)) map.set(key, { key, label: raw, count: 0 });
      map.get(key).count += 1;
    }
    const list = Array.from(map.values()).sort(
      (a, b) => b.count - a.count || a.label.localeCompare(b.label)
    );
    if (sinCentro > 0) list.push({ key: "__sin_centro__", label: "Sin centro médico", count: sinCentro });
    return list;
  }, [doctors]);

  const filtered = useMemo(() => {
    let list = doctors;

    if (selectedCentro === "__sin_centro__") {
      list = list.filter((d) => !d.centro_medico?.trim());
    } else if (selectedCentro) {
      list = list.filter((d) => (d.centro_medico || "").trim().toLowerCase() === selectedCentro);
    }

    const query = q.trim().toLowerCase();
    if (query) {
      list = list.filter((d) => {
        const codigos = (d.doctor_ars_codigos || []).map((c) => c.codigo || "").join(" ");
        const haystack = `${d.nombre || ""} ${d.cedula || ""} ${d.especialidad || ""} ${codigos}`.toLowerCase();
        return haystack.includes(query);
      });
    }

    return list;
  }, [doctors, q, selectedCentro]);

  return (
    <>
      {centros.length > 0 && (
        <div className="mb-4">
          <p className="mb-1 text-xs font-medium text-slate-500">Centros médicos</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCentro("")}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                !selectedCentro
                  ? "bg-brand-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Todos ({doctors.length})
            </button>
            {centros.map((c) => (
              <button
                key={c.key}
                onClick={() => setSelectedCentro(c.key === selectedCentro ? "" : c.key)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  selectedCentro === c.key
                    ? "bg-brand-600 text-white"
                    : c.key === "__sin_centro__"
                      ? "bg-slate-100 text-slate-400 hover:bg-slate-200"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {c.label} ({c.count})
              </button>
            ))}
          </div>
        </div>
      )}

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
