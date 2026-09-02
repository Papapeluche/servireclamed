"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DoctorEditor({ doctor, arsOptions }) {
  const router = useRouter();
  const isEditing = Boolean(doctor?.id);

  const [nombre, setNombre] = useState(doctor?.nombre || "");
  const [cedula, setCedula] = useState(doctor?.cedula || "");
  const [rnc, setRnc] = useState(doctor?.rnc || "");
  const [telefono, setTelefono] = useState(doctor?.telefono || "");
  const [especialidad, setEspecialidad] = useState(doctor?.especialidad || "");
  const [centroMedico, setCentroMedico] = useState(doctor?.centro_medico || "");
  const [codigos, setCodigos] = useState(
    doctor?.doctor_ars_codigos?.map((c) => ({ ars_id: c.ars_id, codigo: c.codigo })) || []
  );
  const [newCodigoArs, setNewCodigoArs] = useState("");
  const [newCodigoValor, setNewCodigoValor] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function arsName(arsId) {
    return arsOptions.find((a) => a.id === arsId)?.nombre || arsId;
  }

  async function handleSave() {
    setError(null);
    if (!nombre.trim()) {
      setError("Ponle un nombre al médico.");
      return;
    }
    setSaving(true);

    const payload = { nombre, cedula, rnc, telefono, especialidad, centro_medico: centroMedico };

    if (isEditing) {
      const res = await fetch(`/api/doctors/${doctor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setSaving(false);
      if (!res.ok) {
        const { error: msg } = await res.json();
        setError(msg || "No se pudo guardar.");
        return;
      }
      router.push("/medicos");
      router.refresh();
    } else {
      const res = await fetch("/api/doctors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, codigos }),
      });
      setSaving(false);
      if (!res.ok) {
        const { error: msg } = await res.json();
        setError(msg || "No se pudo crear.");
        return;
      }
      router.push("/medicos");
      router.refresh();
    }
  }

  async function handleDelete() {
    if (!confirm(`¿Eliminar a ${doctor.nombre} del catálogo? Esto no borra sus reclamaciones ya digitadas.`)) return;
    await fetch(`/api/doctors/${doctor.id}`, { method: "DELETE" });
    router.push("/medicos");
    router.refresh();
  }

  async function addCodigo() {
    if (!newCodigoArs || !newCodigoValor.trim()) return;

    if (isEditing) {
      const res = await fetch(`/api/doctors/${doctor.id}/codigos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ars_id: newCodigoArs, codigo: newCodigoValor }),
      });
      if (!res.ok) {
        const { error: msg } = await res.json();
        setError(msg || "No se pudo agregar el código.");
        return;
      }
      router.refresh();
    }

    setCodigos((prev) => [
      ...prev.filter((c) => c.ars_id !== newCodigoArs),
      { ars_id: newCodigoArs, codigo: newCodigoValor.trim() },
    ]);
    setNewCodigoArs("");
    setNewCodigoValor("");
  }

  async function removeCodigo(arsId) {
    if (isEditing) {
      await fetch(`/api/doctors/${doctor.id}/codigos`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ars_id: arsId }),
      });
      router.refresh();
    }
    setCodigos((prev) => prev.filter((c) => c.ars_id !== arsId));
  }

  const availableArsForNewCode = arsOptions.filter((a) => !codigos.some((c) => c.ars_id === a.id));

  return (
    <div className="max-w-2xl">
      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Nombre</label>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Cédula</label>
          <input
            value={cedula}
            onChange={(e) => setCedula(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            RNC (solo si factura por negocio/consultorio, no por cédula)
          </label>
          <input
            value={rnc}
            onChange={(e) => setRnc(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Teléfono</label>
          <input
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Especialidad</label>
          <input
            value={especialidad}
            onChange={(e) => setEspecialidad(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">Centro médico</label>
          <input
            value={centroMedico}
            onChange={(e) => setCentroMedico(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-800">Códigos por ARS</h3>

        {codigos.length === 0 && (
          <p className="mb-3 text-sm text-slate-400">Este médico todavía no tiene códigos.</p>
        )}

        <div className="mb-3 flex flex-col gap-2">
          {codigos.map((c) => (
            <div key={c.ars_id} className="flex items-center gap-2 rounded-lg bg-slate-50 p-2">
              <span className="w-40 shrink-0 text-sm text-slate-700">{arsName(c.ars_id)}</span>
              <span className="flex-1 text-sm text-slate-500">{c.codigo}</span>
              <button
                type="button"
                onClick={() => removeCodigo(c.ars_id)}
                className="text-sm text-red-500 hover:text-red-700"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {availableArsForNewCode.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <select
              value={newCodigoArs}
              onChange={(e) => setNewCodigoArs(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">ARS...</option>
              {availableArsForNewCode.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </select>
            <input
              value={newCodigoValor}
              onChange={(e) => setNewCodigoValor(e.target.value)}
              placeholder="Código"
              className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={addCodigo}
              disabled={!newCodigoArs || !newCodigoValor.trim()}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
            >
              + Agregar
            </button>
          </div>
        )}
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {saving ? "Guardando..." : "Guardar médico"}
        </button>
        {isEditing && (
          <button
            onClick={handleDelete}
            className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Eliminar
          </button>
        )}
      </div>
    </div>
  );
}
