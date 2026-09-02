"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AsignarComprobantesForm({ doctors }) {
  const router = useRouter();
  const [doctorId, setDoctorId] = useState("");
  const [prefijo, setPrefijo] = useState("");
  const [numeroInicial, setNumeroInicial] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage(null);
    setSaving(true);

    const res = await fetch("/api/comprobantes/asignar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        doctor_id: doctorId,
        prefijo,
        numero_inicial: numeroInicial,
        cantidad,
      }),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setMessage({ type: "error", text: data.error || "No se pudo asignar." });
      return;
    }

    setMessage({ type: "success", text: `${data.creados} comprobante(s) asignados.` });
    setNumeroInicial("");
    setCantidad("");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 rounded-xl border border-slate-200 bg-white p-4"
    >
      <h3 className="mb-3 text-sm font-semibold text-slate-800">
        Asignar comprobantes a un médico
      </h3>
      <div className="grid gap-3 sm:grid-cols-4">
        <select
          value={doctorId}
          onChange={(e) => setDoctorId(e.target.value)}
          required
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
        >
          <option value="">Médico...</option>
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>
              {d.nombre}
            </option>
          ))}
        </select>
        <input
          value={prefijo}
          onChange={(e) => setPrefijo(e.target.value)}
          placeholder="Prefijo (opcional)"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          value={numeroInicial}
          onChange={(e) => setNumeroInicial(e.target.value)}
          type="number"
          placeholder="Número inicial"
          required
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          type="number"
          placeholder="Cantidad"
          required
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={saving || !doctorId}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60 sm:col-span-1"
        >
          {saving ? "Asignando..." : "Asignar"}
        </button>
      </div>
      <p className="mt-2 text-xs text-slate-400">
        Ej. prefijo "A-", número inicial 1001, cantidad 50 → crea A-1001,
        A-1002 ... A-1050, todos disponibles para ese médico.
      </p>
      {message && (
        <p className={`mt-2 text-sm ${message.type === "error" ? "text-red-600" : "text-emerald-600"}`}>
          {message.text}
        </p>
      )}
    </form>
  );
}
