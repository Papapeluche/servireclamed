"use client";

import { useRouter } from "next/navigation";

export default function AnularComprobanteButton({ id }) {
  const router = useRouter();

  async function handleClick() {
    if (!confirm("¿Anular este comprobante? Ya no se podrá usar.")) return;
    await fetch(`/api/comprobantes/${id}/anular`, { method: "POST" });
    router.refresh();
  }

  return (
    <button onClick={handleClick} className="text-xs text-red-500 hover:text-red-700">
      Anular
    </button>
  );
}
