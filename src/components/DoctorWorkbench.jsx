"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export default function DoctorWorkbench({ arsOptions, relaciones, comprobantes }) {
  const arsWithRelaciones = useMemo(() => {
    const ids = new Set(relaciones.map((r) => r.ars_id));
    return arsOptions.filter((a) => ids.has(a.id));
  }, [arsOptions, relaciones]);

  const [selectedArs, setSelectedArs] = useState(arsWithRelaciones[0]?.id || "");

  const relacionesFiltradas = selectedArs
    ? relaciones.filter((r) => r.ars_id === selectedArs)
    : relaciones;

  const usados = comprobantes.filter((c) => c.estado === "usado");

  const porVencer = useMemo(() => {
    const in30 = new Date();
    in30.setDate(in30.getDate() + 30);
    return comprobantes
      .filter((c) => c.estado === "disponible" && c.vencimiento && new Date(c.vencimiento) <= in30)
      .sort((a, b) => new Date(a.vencimiento) - new Date(b.vencimiento));
  }, [comprobantes]);

  return (
    <div>
      {porVencer.length > 0 && (
        <div className="mb-6 rounded-xl border border-warn-500 bg-warn-100/40 p-4">
          <h2 className="mb-2 text-sm font-semibold text-warn-700">
            ⚠ {porVencer.length} comprobante(s) por vencer o vencido(s)
          </h2>
          <ul className="flex flex-col gap-1 text-sm text-warn-700">
            {porVencer.map((c) => {
              const vencido = new Date(c.vencimiento) < new Date();
              return (
                <li key={c.id} className="flex flex-wrap items-center gap-2">
                  <span className="font-mono">NCF {c.numero}</span>
                  <span>·</span>
                  <span>{c.ars_catalog?.nombre || "(sin ARS asignada aún)"}</span>
                  <span>·</span>
                  <span className={vencido ? "font-semibold" : ""}>
                    {vencido ? "Venció" : "Vence"} el {c.vencimiento}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-1 text-sm font-semibold text-slate-800">Facturación por ARS</h2>
        <p className="mb-3 text-xs text-slate-500">
          Historial de relaciones y hojas de presentación de este médico, por ARS.
        </p>

        {arsWithRelaciones.length === 0 ? (
          <p className="text-sm text-slate-400">
            Este médico todavía no tiene ninguna relación generada.
          </p>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedArs("")}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  !selectedArs
                    ? "bg-brand-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Todas
              </button>
              {arsWithRelaciones.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setSelectedArs(a.id)}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    selectedArs === a.id
                      ? "bg-brand-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {a.nombre}
                </button>
              ))}
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-100">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Fecha</th>
                    <th className="px-3 py-2">ARS</th>
                    <th className="px-3 py-2">Total</th>
                    <th className="px-3 py-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {relacionesFiltradas.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-3 py-2">
                        <Link href={`/relaciones/${r.id}`} className="text-brand-600 hover:underline">
                          {r.fecha}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-slate-500">{r.ars_catalog?.nombre}</td>
                      <td className="px-3 py-2">RD$ {Number(r.total_monto).toFixed(2)}</td>
                      <td className="px-3 py-2">
                        {r.hoja_generada_at ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                            Hoja generada
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                            Solo relación
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-1 text-sm font-semibold text-slate-800">Comprobantes (NCF) usados</h2>
        <p className="mb-3 text-xs text-slate-500">
          Cada comprobante usado queda ligado a la hoja de presentación en la que se facturó.
        </p>

        {usados.length === 0 ? (
          <p className="text-sm text-slate-400">Este médico todavía no ha usado ningún comprobante.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {usados.map((c) => (
              <ComprobanteRow key={c.id} comprobante={c} />
            ))}
          </ul>
        )}
      </section>
      </div>
    </div>
  );
}

function ComprobanteRow({ comprobante }) {
  const [open, setOpen] = useState(false);

  return (
    <li className="rounded-lg border border-slate-100">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
      >
        <span className="font-medium text-slate-800">NCF {comprobante.numero}</span>
        <span className="text-slate-500">{comprobante.ars_catalog?.nombre}</span>
        <span className="font-medium text-slate-700">
          RD$ {Number(comprobante.monto || 0).toFixed(2)}
        </span>
        <span className="text-xs text-slate-400">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="border-t border-slate-100 px-3 py-2 text-xs text-slate-600">
          <p>
            Usado el {comprobante.used_at ? new Date(comprobante.used_at).toLocaleString() : "—"}
          </p>
          {comprobante.relaciones ? (
            <p className="mt-1">
              En la relación del {comprobante.relaciones.fecha} · Total RD${" "}
              {Number(comprobante.relaciones.total_monto).toFixed(2)}
            </p>
          ) : (
            <p className="mt-1 text-slate-400">No se encontró la relación asociada.</p>
          )}
          {comprobante.relacion_id && (
            <Link
              href={`/relaciones/${comprobante.relacion_id}`}
              className="mt-2 inline-block text-brand-600 hover:underline"
            >
              Ver todos los datos relacionados →
            </Link>
          )}
        </div>
      )}
    </li>
  );
}
