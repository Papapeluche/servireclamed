"use client";

import { useState } from "react";
import Link from "next/link";
import ImageZoomViewer from "@/components/ImageZoomViewer";

export default function ImagenesRelacion({ images, relacionId }) {
  const [index, setIndex] = useState(0);
  const [showOriginal, setShowOriginal] = useState(false);
  if (!images.length) return <p>No hay imágenes en esta relación.</p>;
  const item = images[index];
  const repeated = images.findIndex((x) => x.image_path === item.image_path) !== index;

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <button disabled={index === 0} onClick={() => setIndex(index - 1)} className="rounded border px-3 py-2 disabled:opacity-40">← Anterior</button>
        <span className="text-sm font-semibold">{index + 1} de {images.length}</span>
        <button disabled={index === images.length - 1} onClick={() => setIndex(index + 1)} className="rounded border px-3 py-2 disabled:opacity-40">Siguiente →</button>
      </div>
      <p className="mb-2 text-sm">
        {item.afiliado_nombre || "Afiliado sin nombre"} · {item.fecha_servicio || "Sin fecha"} · {item.tipo_servicio || "Sin tipo"}
        {repeated && <span className="ml-2 text-amber-700">Esta hoja contiene otra línea de la relación.</span>}
      </p>
      {item.url ? <div className="h-[70vh] overflow-hidden rounded border"><ImageZoomViewer src={showOriginal ? item.originalUrl : item.url} alt={`Reclamación ${index + 1}`} /></div>
        : <p className="rounded border p-8">No se pudo cargar la imagen de esta reclamación.</p>}
      <div className="mt-3 flex flex-wrap gap-4 text-sm">
        <Link className="text-brand-600 underline" href={`/reclamaciones/${item.id}`}>Revisar esta reclamación</Link>
        {item.originalUrl && <button onClick={() => setShowOriginal(!showOriginal)} className="text-brand-600 underline">
          {showOriginal ? "Ver escaneo mejorado" : "Comparar con original"}
        </button>}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        <span className="font-medium">Descargar esta reclamación:</span>
        <a className="text-brand-600 underline" href={`/api/relaciones/${relacionId}/imagenes?format=pdf&claimId=${item.id}`}>PDF</a>
        <a className="text-brand-600 underline" href={item.url} download={`reclamacion_${item.position}.jpg`}>JPEG mejorado</a>
        <a className="text-brand-600 underline" href={`/api/relaciones/${relacionId}/imagenes?format=original&claimId=${item.id}`}>Original (.zip)</a>
      </div>
      <p className="mt-3 text-xs text-slate-500">La mejora ajusta suavemente nitidez y luminosidad; el escaneo original se conserva.</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {images.map((image, i) => <button key={image.id} onClick={() => setIndex(i)} aria-label={`Ver imagen ${i + 1}`}
          className={`rounded border px-2 py-1 text-xs ${i === index ? "border-brand-600 bg-blue-50" : "border-slate-200"}`}>{i + 1}</button>)}
      </div>
      <div className="mt-8 border-t pt-5">
        <p className="mb-3 text-sm text-slate-600">Después de revisar las imágenes, puedes descargar la relación completa en el mismo orden.</p>
        <div className="flex flex-wrap gap-3">
          <a href={`/api/relaciones/${relacionId}/imagenes?format=pdf`}
            className="inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white">Descargar PDF</a>
          <a href={`/api/relaciones/${relacionId}/imagenes?format=jpeg`}
            className="inline-block rounded-lg border px-4 py-2 text-sm font-medium">Descargar JPEG (.zip)</a>
          <a href={`/api/relaciones/${relacionId}/imagenes?format=original`}
            className="inline-block rounded-lg border px-4 py-2 text-sm font-medium">Descargar originales (.zip)</a>
        </div>
      </div>
    </div>
  );
}
