"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BorrarReclamacionBoton({ claimId, nombre }) {
  const router = useRouter();
  const [borrando, setBorrando] = useState(false);

  async function borrar() {
    const quien = nombre ? ` de ${nombre}` : "";
    if (!confirm(`¿Eliminar la reclamación${quien}? Se borra junto con su foto y no se puede deshacer.`)) return;
    setBorrando(true);
    const res = await fetch(`/api/claims/${claimId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "No se pudo eliminar.");
      setBorrando(false);
      return;
    }
    router.refresh();
  }

  return (
    <button
      onClick={borrar}
      disabled={borrando}
      title="Eliminar esta reclamación"
      className="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
    >
      {borrando ? "Eliminando..." : "Eliminar"}
    </button>
  );
}
