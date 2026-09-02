"use client";

import { useRouter } from "next/navigation";

export default function AnularComprobanteButton({ id }) {
  const router = useRouter();

  async function handleClick() {
    if (!confirm("¿Anular este comprobante? Ya no se podrá usar.")) return;
    const res = await fetch(`/api/comprobantes/${id}/anular`, { method: "POST" });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({}));
      alert(error || "No se pudo anular el comprobante.");
      return;
    }
    router.refresh();
  }

  return (
    <button onClick={handleClick} className="text-xs text-red-500 hover:text-red-700">
      Anular
    </button>
  );
}
