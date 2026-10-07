"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Pocas a la vez: si Gemini está saturado o en el límite por minuto del
// plan gratis, mandar muchas juntas solo provoca más rechazos.
const CONCURRENCIA = 2;

// Aviso en el dashboard con las reclamaciones que la IA no pudo leer
// (Gemini saturado, límite por minuto, etc.) y un botón para reintentarlas
// todas, en vez de abrir una por una. Solo incluye las "pendiente": una "en
// proceso" ya la tocó alguien a mano y no se le pisan los datos.
export default function ReintentarIABoton({ ids }) {
  const router = useRouter();
  const [progreso, setProgreso] = useState(null); // { hechas, total, ok }
  const [resultado, setResultado] = useState(null);

  if (!ids.length && !resultado) return null;

  async function reintentar() {
    const cola = [...ids];
    const total = cola.length;
    let hechas = 0;
    let ok = 0;
    setResultado(null);
    setProgreso({ hechas, total, ok });

    async function trabajador() {
      while (cola.length) {
        const id = cola.shift();
        const res = await fetch(`/api/claims/${id}/analizar`, { method: "POST" }).catch(() => null);
        if (res?.ok) ok++;
        setProgreso({ hechas: ++hechas, total, ok });
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCIA, total) }, trabajador));

    setProgreso(null);
    setResultado({ total, ok });
    router.refresh();
  }

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
      {progreso ? (
        <span className="text-amber-900">
          Leyendo con IA {progreso.hechas} de {progreso.total}… ({progreso.ok} leídas). Puedes seguir
          trabajando, pero no cierres esta pestaña.
        </span>
      ) : (
        <>
          {resultado && (
            <span className="text-amber-900">
              Se leyeron {resultado.ok} de {resultado.total}.
              {resultado.ok < resultado.total && " Las demás siguen pendientes."}
            </span>
          )}
          {ids.length > 0 && (
            <>
              <span className="text-amber-900">
                <strong>{ids.length}</strong> reclamación(es) pendiente(s) no se pudieron leer con IA
                (normalmente porque Gemini estaba saturado en ese momento).
              </span>
              <button
                onClick={reintentar}
                className="rounded-lg bg-amber-600 px-3 py-1.5 font-medium text-white hover:bg-amber-700"
              >
                Reintentar lectura con IA
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}
