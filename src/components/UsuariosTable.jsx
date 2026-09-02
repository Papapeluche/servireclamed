"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const ROLES = [
  { value: "digitador", label: "Digitador" },
  { value: "supervisor", label: "Supervisor" },
  { value: "admin", label: "Admin" },
];

const ROLE_STYLES = {
  admin: "bg-brand-100 text-brand-700",
  supervisor: "bg-emerald-100 text-emerald-700",
  digitador: "bg-slate-100 text-slate-600",
};

export default function UsuariosTable({ usuarios, currentUserId }) {
  const router = useRouter();
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState(null);
  const [editingNameId, setEditingNameId] = useState(null);
  const [nameDraft, setNameDraft] = useState("");
  const [resetId, setResetId] = useState(null);
  const [resetPassword, setResetPassword] = useState("");

  async function changeRole(id, role) {
    setError(null);
    setSavingId(id);

    const res = await fetch(`/api/usuarios/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });

    setSavingId(null);

    if (!res.ok) {
      const { error: msg } = await res.json().catch(() => ({}));
      setError(msg || "No se pudo cambiar el rol.");
      return;
    }

    router.refresh();
  }

  function startEditName(u) {
    setEditingNameId(u.id);
    setNameDraft(u.full_name || "");
  }

  async function saveName(id) {
    setError(null);
    setSavingId(id);

    const res = await fetch(`/api/usuarios/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: nameDraft }),
    });

    setSavingId(null);

    if (!res.ok) {
      const { error: msg } = await res.json().catch(() => ({}));
      setError(msg || "No se pudo cambiar el nombre.");
      return;
    }

    setEditingNameId(null);
    router.refresh();
  }

  async function submitReset(id) {
    if (!resetPassword || resetPassword.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    setError(null);
    setSavingId(id);

    const res = await fetch(`/api/usuarios/${id}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: resetPassword }),
    });

    setSavingId(null);

    if (!res.ok) {
      const { error: msg } = await res.json().catch(() => ({}));
      setError(msg || "No se pudo resetear la contraseña.");
      return;
    }

    setResetId(null);
    setResetPassword("");
    alert("Contraseña actualizada.");
  }

  return (
    <div>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2">Nombre</th>
              <th className="px-4 py-2">Correo</th>
              <th className="px-4 py-2">Rol</th>
              <th className="px-4 py-2">Desde</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id} className="border-t border-slate-100 align-top">
                <td className="px-4 py-2 text-slate-800">
                  {editingNameId === u.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        value={nameDraft}
                        onChange={(e) => setNameDraft(e.target.value)}
                        className="w-32 rounded border border-slate-300 px-2 py-1 text-xs"
                        autoFocus
                      />
                      <button
                        onClick={() => saveName(u.id)}
                        disabled={savingId === u.id}
                        className="text-xs text-brand-600 hover:underline"
                      >
                        Guardar
                      </button>
                      <button
                        onClick={() => setEditingNameId(null)}
                        className="text-xs text-slate-400 hover:underline"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => startEditName(u)} className="text-left hover:underline">
                      {u.full_name || "(sin nombre)"}
                    </button>
                  )}
                  {u.id === currentUserId && (
                    <span className="ml-2 text-xs text-slate-400">(tú)</span>
                  )}
                </td>
                <td className="px-4 py-2 text-slate-500">{u.email || "—"}</td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_STYLES[u.role] || "bg-slate-100 text-slate-600"}`}
                    >
                      {ROLES.find((r) => r.value === u.role)?.label || u.role}
                    </span>
                    <select
                      value={u.role}
                      disabled={savingId === u.id}
                      onChange={(e) => changeRole(u.id, e.target.value)}
                      className="rounded-lg border border-slate-300 px-2 py-1 text-xs disabled:opacity-50"
                    >
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </td>
                <td className="px-4 py-2 text-slate-500">
                  {new Date(u.created_at).toLocaleDateString("es-DO")}
                </td>
                <td className="px-4 py-2">
                  {resetId === u.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={resetPassword}
                        onChange={(e) => setResetPassword(e.target.value)}
                        placeholder="Nueva contraseña"
                        className="w-28 rounded border border-slate-300 px-2 py-1 text-xs"
                        autoFocus
                      />
                      <button
                        onClick={() => submitReset(u.id)}
                        disabled={savingId === u.id}
                        className="text-xs text-brand-600 hover:underline"
                      >
                        Guardar
                      </button>
                      <button
                        onClick={() => {
                          setResetId(null);
                          setResetPassword("");
                        }}
                        className="text-xs text-slate-400 hover:underline"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setResetId(u.id)}
                      className="text-xs text-slate-500 hover:text-brand-600 hover:underline"
                    >
                      Resetear contraseña
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {usuarios.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  No hay usuarios.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
