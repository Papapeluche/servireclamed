"use client";

import { useState } from "react";
import HojaPresentacionPanel from "@/components/HojaPresentacionPanel";

export default function GenerarHojaPresentacionButton({ relacionId, templates, comprobante }) {
  const [open, setOpen] = useState(false);

  if (!templates || templates.length === 0) {
    return <span className="text-xs text-slate-300">Sin plantilla de hoja</span>;
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs text-brand-600 hover:underline">
        Hoja de presentación
      </button>
    );
  }

  return (
    <HojaPresentacionPanel
      relacionId={relacionId}
      templates={templates}
      comprobante={comprobante}
      onClose={() => setOpen(false)}
    />
  );
}
