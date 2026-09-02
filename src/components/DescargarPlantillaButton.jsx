"use client";

import { useState } from "react";
import RelacionExportPanel from "@/components/RelacionExportPanel";

export default function DescargarPlantillaButton({ relacionId, templates }) {
  const [open, setOpen] = useState(false);

  if (!templates || templates.length === 0) {
    return (
      <a href={`/api/relaciones/${relacionId}/export`} className="text-xs text-brand-600 hover:underline">
        Descargar plantilla
      </a>
    );
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs text-brand-600 hover:underline">
        Descargar plantilla
      </button>
    );
  }

  return (
    <RelacionExportPanel relacionId={relacionId} templates={templates} onClose={() => setOpen(false)} />
  );
}
