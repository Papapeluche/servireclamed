"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function GenerarRelacionButton({ arsId, doctorNombre, doctorCodigo }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const res = await fetch("/api/relaciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ars_id: arsId, doctor_nombre: doctorNombre, doctor_codigo: doctorCodigo }),
    });
    setLoading(false);

    if (res.ok) {
      router.refresh();
    } else {
      const { error } = await res.json();
      alert(error || "No se pudo generar la relación.");
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
    >
      {loading ? "Generando..." : "Generar relación"}
    </button>
  );
}
