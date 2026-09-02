"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DoctorArsCodigos({ doctorId, codigos: initialCodigos, arsOptions }) {
  const router = useRouter();
  const [codigos, setCodigos] = useState(initialCodigos);
  const [newArs, setNewArs] = useState("");
  const [newCodigo, setNewCodigo] = useState("");
  const [error, setError] = useState(null);

  const sorted = [...codigos].sort((a, b) => arsName(a.ars_id).localeCompare(arsName(b.ars_id)));
  const availableArs = arsOptions.filter((a) => !codigos.some((c) => c.ars_id === a.id));

  function arsName(arsId) {
    return arsOptions.find((a) => a.id === arsId)?.nombre || arsId;
  }

  async function addCodigo() {
    if (!newArs || !newCodigo.trim()) return;
    setError(null);

    const res = await fetch(`/api/doctors/${doctorId}/codigos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ars_id: newArs, codigo: newCodigo.trim() }),
    });

    if (!res.ok) {
      const { error: msg } = await res.json();
      setError(msg || "No se pudo agregar el código.");
      return;
    }

    setCodigos((prev) => [...prev.filter((c) => c.ars_id !== newArs), { ars_id: newArs, codigo: newCodigo.trim() }]);
    setNewArs("");
    setNewCodigo("");
    router.refresh();
  }

  async function removeCodigo(arsId) {
    await fetch(`/api/doctors/${doctorId}/codigos`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ars_id: arsId }),
    });
    setCodigos((prev) => prev.filter((c) => c.ars_id !== arsId));
    router.refresh();
  }

  return (
    <section className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="mb-1 text-sm font-semibold text-slate-800">ARS y códigos</h2>
      <p className="mb-3 text-xs text-slate-500">
        El código de este médico en cada ARS — se usa para autocompletar al digitar.
      </p>

      {sorted.length === 0 ? (
        <p className="mb-3 text-sm text-slate-400">Este médico todavía no tiene códigos registrados.</p>
      ) : (
        <div className="mb-3 overflow-hidden rounded-lg border border-slate-100">
          {sorted.map((c, i) => (
            <div
              key={c.ars_id}
              className={`flex items-center justify-between gap-3 px-3 py-2 text-sm ${
                i > 0 ? "border-t border-slate-100" : ""
              }`}
            >
              <span className="font-medium text-slate-700">{arsName(c.ars_id)}</span>
              <span className="font-mono text-slate-500">{c.codigo}</span>
              <button
                type="button"
                onClick={() => removeCodigo(c.ars_id)}
                className="text-xs text-red-500 hover:text-red-700"
              >
                Quitar
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}

      {availableArs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <select
            value={newArs}
            onChange={(e) => setNewArs(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Agregar ARS...</option>
            {availableArs.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </select>
          <input
            value={newCodigo}
            onChange={(e) => setNewCodigo(e.target.value)}
            placeholder="Código"
            className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={addCodigo}
            disabled={!newArs || !newCodigo.trim()}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
          >
            + Agregar
          </button>
        </div>
      )}
    </section>
  );
}
