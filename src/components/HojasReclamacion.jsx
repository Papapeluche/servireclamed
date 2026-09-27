"use client";

import { useState } from "react";
import ImageZoomViewer from "@/components/ImageZoomViewer";
import { createClient } from "@/lib/supabase/client";
import { subirAnexo, quitarAnexo, aJpeg } from "@/lib/anexos";

// La hoja principal de la reclamación y sus anexos, con pestañas para
// verlas y un botón para agregar anexos (cámara o galería) o quitarlos.
export default function HojasReclamacion({ claimId, imageUrl, anexosIniciales = [], puedeEditar = true }) {
  const [anexos, setAnexos] = useState(anexosIniciales); // [{ id, url }]
  const [actual, setActual] = useState(0); // 0 = principal, 1..n = anexo
  const [subiendo, setSubiendo] = useState(0);
  const [error, setError] = useState(null);

  async function agregar(e) {
    const archivos = Array.from(e.target.files || []);
    e.target.value = "";
    if (!archivos.length) return;
    setError(null);
    setSubiendo(archivos.length);
    const supabase = createClient();
    let fallidos = 0;
    for (const archivo of archivos) {
      try {
        const jpeg = await aJpeg(archivo);
        const anexo = await subirAnexo(supabase, claimId, jpeg);
        setAnexos((prev) => [...prev, { id: anexo.id, url: URL.createObjectURL(jpeg) }]);
      } catch {
        fallidos++;
      }
      setSubiendo((n) => n - 1);
    }
    if (fallidos) setError(`No se pudieron subir ${fallidos} anexo(s). Intenta de nuevo.`);
  }

  async function quitar(i) {
    const anexo = anexos[i - 1];
    if (!anexo || !confirm(`¿Quitar el anexo ${i}? No se puede deshacer.`)) return;
    try {
      await quitarAnexo(claimId, anexo.id);
      setAnexos((prev) => prev.filter((a) => a.id !== anexo.id));
      setActual((a) => Math.max(0, Math.min(a, anexos.length - 1)));
    } catch (err) {
      setError(err.message);
    }
  }

  const hojas = [{ id: "principal", url: imageUrl }, ...anexos];
  const hoja = hojas[Math.min(actual, hojas.length - 1)];

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {hojas.map((h, i) => (
          <button
            key={h.id}
            onClick={() => setActual(i)}
            className={`rounded-md border px-2 py-1 text-xs font-medium ${
              i === actual
                ? i === 0
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-amber-500 bg-amber-500 text-white"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {i === 0 ? "Reclamación" : `📎 Anexo ${i}`}
          </button>
        ))}
        {puedeEditar && (
          <label className="cursor-pointer rounded-md border border-dashed border-amber-400 px-2 py-1 text-xs font-medium text-amber-800 hover:bg-amber-50">
            {subiendo ? `Subiendo ${subiendo}...` : "+ Agregar anexos"}
            <input type="file" accept="image/*" multiple onChange={agregar} className="hidden" disabled={subiendo > 0} />
          </label>
        )}
        {puedeEditar && actual > 0 && (
          <button onClick={() => quitar(actual)} className="ml-auto text-xs text-red-600 hover:underline">
            Quitar este anexo
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="min-h-0 flex-1">
        <ImageZoomViewer key={hoja.id} src={hoja.url} alt={actual === 0 ? "Reclamación escaneada" : `Anexo ${actual}`} />
      </div>
    </div>
  );
}
