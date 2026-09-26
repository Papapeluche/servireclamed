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
  const [estado, setEstado] = useState("");
  const [medico, setMedico] = useState("");

  // Un médico por opción, con cuántos comprobantes disponibles le quedan.
  const medicos = useMemo(() => {
    const m = new Map();
    for (const c of comprobantes) {
      if (!c.doctor_id) continue;
      const e = m.get(c.doctor_id) || { id: c.doctor_id, nombre: c.doctors?.nombre || "—", disponibles: 0 };
      if (c.estado === "disponible") e.disponibles++;
      m.set(c.doctor_id, e);
    }
    return [...m.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [comprobantes]);

  // Búsqueda por palabras sueltas, en cualquier orden y sin tildes:
  // "cristian escarfuller" encuentra "Cristian Antonio Escarfuller Olivo".
  const filtered = useMemo(() => {
    const palabras = normalizar(q).split(" ").filter(Boolean);
    return comprobantes
      .filter((c) => !estado || c.estado === estado)
      .filter((c) => !medico || c.doctor_id === medico)
      .filter((c) => {
        if (!palabras.length) return true;
        const texto = normalizar(
          `${c.numero || ""} ${c.doctors?.nombre || ""} ${c.doctors?.cedula || ""} ${c.ars_catalog?.nombre || ""} ${ESTADO_LABELS[c.estado] || ""}`
        );
        return palabras.every((p) => texto.includes(p));
      })
      .sort(
        (a, b) =>
          (a.doctors?.nombre || "").localeCompare(b.doctors?.nombre || "", "es") ||
          String(a.numero).localeCompare(String(b.numero), "es", { numeric: true })
      );
  }, [comprobantes, q, estado, medico]);

  const porEstado = useMemo(() => {
    const base = comprobantes.filter((c) => !medico || c.doctor_id === medico);
    const r = { "": base.length };
    for (const c of base) r[c.estado] = (r[c.estado] || 0) + 1;
    return r;
  }, [comprobantes, medico]);

  const hayFiltros = q || estado || medico;

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Buscar por número, médico, cédula o ARS..."
          className="w-full max-w-md"
        />
        <select
          value={medico}
          onChange={(e) => setMedico(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          aria-label="Filtrar por médico"
        >
          <option value="">Todos los médicos</option>
          {medicos.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nombre} ({m.disponibles} disponible{m.disponibles === 1 ? "" : "s"})
            </option>
          ))}
        </select>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        {[["", "Todos"], ...Object.entries(ESTADO_LABELS)].map(([valor, label]) => (
          <button
            key={valor || "todos"}
            onClick={() => setEstado(valor)}
            className={`rounded-full border px-3 py-1 ${
              estado === valor
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {label} <span className="opacity-75">({porEstado[valor] || 0})</span>
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-500">
          Mostrando {filtered.length} de {comprobantes.length}
          {hayFiltros && (
            <>
              {" · "}
              <button
                onClick={() => {
                  setQ("");
                  setEstado("");
                  setMedico("");
                }}
                className="text-brand-600 hover:underline"
              >
                Quitar filtros
              </button>
            </>
          )}
        </span>
      </div>

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
                    : "Ningún comprobante coincide con esos filtros."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function normalizar(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
