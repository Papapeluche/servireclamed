"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import ImageZoomViewer from "@/components/ImageZoomViewer";

const CONCURRENCIA = 3;

// Botón + modal de la "relación de reclamaciones": las fotos de cada
// reclamación de la relación, escaneadas (recortadas, enderezadas, sin
// sombras) y en el mismo orden que las filas de la relación de Excel.
export default function RelacionImagenesBoton({ relacionId, titulo, fecha, filas }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <button
        onClick={() => setAbierto(true)}
        disabled={filas.length === 0}
        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        Crear o ver relación de reclamaciones
      </button>
      {abierto && (
        <Modal
          relacionId={relacionId}
          titulo={titulo}
          fecha={fecha}
          filas={filas}
          onClose={() => setAbierto(false)}
        />
      )}
    </>
  );
}

function Modal({ relacionId, titulo, fecha, filas, onClose }) {
  // Estado por imagen (varias filas pueden compartir la misma hoja): se pide
  // una sola vez por image_path.
  const [imagenes, setImagenes] = useState({}); // image_path -> { estado, url, blob, recortado }
  const [seleccion, setSeleccion] = useState(null); // índice de fila en vista ampliada
  const [verOriginal, setVerOriginal] = useState(false);
  const [originales, setOriginales] = useState({}); // image_path -> url
  const [ocupado, setOcupado] = useState(null); // "pdf" | "zip" | "compartir" | "imprimir"
  const [aviso, setAviso] = useState(null);
  const urlsRef = useRef([]);
  const pdfRef = useRef(null);

  const rutas = useMemo(() => {
    const vistas = new Map();
    for (const f of filas) if (f.image_path && !vistas.has(f.image_path)) vistas.set(f.image_path, f.id);
    return [...vistas.entries()].map(([path, claimId]) => ({ path, claimId }));
  }, [filas]);

  const pedir = useCallback(
    async ({ path, claimId }, { regenerar = false, signal } = {}) => {
      setImagenes((prev) => ({ ...prev, [path]: { ...prev[path], estado: "cargando" } }));
      try {
        const qs = regenerar ? "?regenerar=1" : "";
        const res = await fetch(`/api/relaciones/${relacionId}/imagenes/${claimId}${qs}`, { signal });
        if (!res.ok) throw new Error(await res.text());
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        urlsRef.current.push(url);
        const recortado = (res.headers.get("X-Escaneo") || "").includes("recortado");
        pdfRef.current = null;
        setImagenes((prev) => ({ ...prev, [path]: { estado: "listo", url, blob, recortado } }));
      } catch (e) {
        if (e.name === "AbortError") return;
        setImagenes((prev) => ({ ...prev, [path]: { estado: "error", error: e.message } }));
      }
    },
    [relacionId]
  );

  useEffect(() => {
    const control = new AbortController();
    let siguiente = 0;
    async function trabajador() {
      while (siguiente < rutas.length && !control.signal.aborted) {
        const r = rutas[siguiente++];
        await pedir(r, { signal: control.signal });
      }
    }
    Promise.all(Array.from({ length: Math.min(CONCURRENCIA, rutas.length) }, trabajador));
    return () => control.abort();
  }, [rutas, pedir]);

  useEffect(() => {
    const urls = urlsRef.current;
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  useEffect(() => {
    function tecla(e) {
      if (e.key === "Escape") {
        if (seleccion !== null) setSeleccion(null);
        else onClose();
      }
      if (seleccion !== null && e.key === "ArrowRight") setSeleccion((i) => Math.min(filas.length - 1, i + 1));
      if (seleccion !== null && e.key === "ArrowLeft") setSeleccion((i) => Math.max(0, i - 1));
    }
    window.addEventListener("keydown", tecla);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", tecla);
      document.body.style.overflow = overflow;
    };
  }, [seleccion, filas.length, onClose]);

  const listos = rutas.filter((r) => imagenes[r.path]?.estado === "listo").length;
  const errores = rutas.filter((r) => imagenes[r.path]?.estado === "error").length;
  const terminado = listos + errores === rutas.length;
  const nombreBase = limpiarNombre(`relacion_reclamaciones_${titulo}_${fecha}`);

  async function construirPdf() {
    if (pdfRef.current) return pdfRef.current;
    const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
    const pdf = await PDFDocument.create();
    const fuente = await pdf.embedFont(StandardFonts.Helvetica);
    const cacheEmbebido = new Map();
    for (const [i, fila] of filas.entries()) {
      const img = imagenes[fila.image_path];
      const encabezado = latin1(
        `Fila ${i + 1} · ${fila.afiliado_nombre || "Afiliado sin nombre"} · ${fila.fecha_servicio || "sin fecha"} · ${fila.tipo_servicio || ""}`
      );
      if (img?.estado !== "listo") {
        const page = pdf.addPage([595.28, 841.89]);
        page.drawText(encabezado, { x: 28, y: 815, size: 9, font: fuente, color: rgb(0.2, 0.2, 0.2) });
        page.drawText("Imagen no disponible", { x: 28, y: 420, size: 14, font: fuente, color: rgb(0.6, 0, 0) });
        continue;
      }
      let emb = cacheEmbebido.get(fila.image_path);
      if (!emb) {
        emb = await pdf.embedJpg(await img.blob.arrayBuffer());
        cacheEmbebido.set(fila.image_path, emb);
      }
      const horizontal = emb.width > emb.height;
      const [pw, ph] = horizontal ? [841.89, 595.28] : [595.28, 841.89];
      const page = pdf.addPage([pw, ph]);
      page.drawText(encabezado, { x: 28, y: ph - 22, size: 9, font: fuente, color: rgb(0.2, 0.2, 0.2) });
      const escala = Math.min((pw - 36) / emb.width, (ph - 50) / emb.height);
      const w = emb.width * escala, h = emb.height * escala;
      page.drawImage(emb, { x: (pw - w) / 2, y: (ph - 32 - h) / 2, width: w, height: h });
    }
    const blob = new Blob([await pdf.save()], { type: "application/pdf" });
    pdfRef.current = blob;
    return blob;
  }

  async function accion(tipo, fn) {
    setOcupado(tipo);
    setAviso(null);
    try {
      await fn();
    } catch (e) {
      if (e?.name !== "AbortError") setAviso({ tipo: "error", texto: `No se pudo completar: ${e?.message || e}` });
    } finally {
      setOcupado(null);
    }
  }

  const descargarPdf = () => accion("pdf", async () => descargar(await construirPdf(), `${nombreBase}.pdf`));

  const descargarZip = () =>
    accion("zip", async () => {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      const ancho = String(filas.length).length;
      const indice = ["fila,afiliado,fecha_servicio,tipo_servicio,archivo"];
      filas.forEach((fila, i) => {
        const img = imagenes[fila.image_path];
        const archivo =
          img?.estado === "listo"
            ? `${String(i + 1).padStart(ancho, "0")}_${limpiarNombre(fila.afiliado_nombre || "reclamacion")}.jpg`
            : "(no disponible)";
        if (img?.estado === "listo") zip.file(archivo, img.blob);
        indice.push(
          [i + 1, fila.afiliado_nombre || "", fila.fecha_servicio || "", fila.tipo_servicio || "", archivo]
            .map((v) => `"${String(v).replaceAll('"', '""')}"`)
            .join(",")
        );
      });
      zip.file("indice.csv", "﻿" + indice.join("\r\n"));
      descargar(await zip.generateAsync({ type: "blob" }), `${nombreBase}.zip`);
    });

  const compartir = () =>
    accion("compartir", async () => {
      const archivo = new File([await construirPdf()], `${nombreBase}.pdf`, { type: "application/pdf" });
      if (navigator.canShare?.({ files: [archivo] })) {
        await navigator.share({ files: [archivo], title: `Relación de reclamaciones — ${titulo}` });
      } else {
        descargar(archivo, archivo.name);
        setAviso({
          tipo: "info",
          texto: "Este navegador no permite compartir archivos directo; se descargó el PDF para que lo adjuntes por WhatsApp o correo.",
        });
      }
    });

  const imprimir = () =>
    accion("imprimir", async () => {
      const url = URL.createObjectURL(await construirPdf());
      urlsRef.current.push(url);
      const ventana = window.open(url, "_blank");
      if (!ventana) {
        setAviso({ tipo: "info", texto: "El navegador bloqueó la ventana. Permite ventanas emergentes o usa Descargar PDF e imprímelo." });
      }
    });

  async function verOriginalDe(fila) {
    if (!originales[fila.image_path]) {
      const res = await fetch(`/api/relaciones/${relacionId}/imagenes/${fila.id}?tipo=original`);
      if (res.ok) {
        const url = URL.createObjectURL(await res.blob());
        urlsRef.current.push(url);
        setOriginales((prev) => ({ ...prev, [fila.image_path]: url }));
      }
    }
    setVerOriginal(true);
  }

  const filaSel = seleccion !== null ? filas[seleccion] : null;
  const imgSel = filaSel ? imagenes[filaSel.image_path] : null;
  const compartidaCon = filaSel
    ? filas.map((f, i) => (f.image_path === filaSel.image_path && i !== seleccion ? i + 1 : null)).filter(Boolean)
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/60 p-0 sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Relación de reclamaciones"
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-6xl flex-col overflow-hidden bg-white sm:rounded-xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900">Relación de reclamaciones</h2>
            <p className="text-xs text-slate-500">
              {titulo} · {fecha} · {filas.length} reclamación(es) — mismo orden que la relación de Excel
            </p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="shrink-0 rounded-lg px-2 py-1 text-xl leading-none text-slate-500 hover:bg-slate-100">
            ×
          </button>
        </header>

        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-2">
          <button onClick={descargarPdf} disabled={!terminado || ocupado} className={btnPrimario}>
            {ocupado === "pdf" ? "Armando PDF..." : "Descargar PDF"}
          </button>
          <button onClick={descargarZip} disabled={!terminado || ocupado} className={btn}>
            {ocupado === "zip" ? "Armando ZIP..." : "Descargar imágenes (ZIP)"}
          </button>
          <button onClick={compartir} disabled={!terminado || ocupado} className={btn}>
            {ocupado === "compartir" ? "Preparando..." : "Compartir"}
          </button>
          <button onClick={imprimir} disabled={!terminado || ocupado} className={btn}>
            {ocupado === "imprimir" ? "Preparando..." : "Imprimir"}
          </button>
          <span className="ml-auto text-xs text-slate-500">
            {terminado
              ? `${listos} de ${rutas.length} hojas escaneadas${errores ? ` · ${errores} con error` : ""}`
              : `Escaneando ${listos + errores + 1 > rutas.length ? rutas.length : listos + errores + 1} de ${rutas.length}...`}
          </span>
        </div>
        {!terminado && (
          <div className="h-1 w-full bg-slate-100">
            <div className="h-1 bg-brand-600 transition-all" style={{ width: `${((listos + errores) / Math.max(1, rutas.length)) * 100}%` }} />
          </div>
        )}
        {aviso && (
          <p className={`px-4 py-2 text-sm ${aviso.tipo === "error" ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"}`}>{aviso.texto}</p>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {filaSel ? (
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <button onClick={() => setSeleccion(null)} className={btn}>← Todas</button>
                <button onClick={() => { setSeleccion(seleccion - 1); setVerOriginal(false); }} disabled={seleccion === 0} className={btn}>Anterior</button>
                <span className="text-sm font-semibold text-slate-800">Fila {seleccion + 1} de {filas.length}</span>
                <button onClick={() => { setSeleccion(seleccion + 1); setVerOriginal(false); }} disabled={seleccion === filas.length - 1} className={btn}>Siguiente</button>
              </div>
              <p className="mb-2 text-sm text-slate-600">
                {filaSel.afiliado_nombre || "Afiliado sin nombre"} · {filaSel.fecha_servicio || "sin fecha"} · {filaSel.tipo_servicio || "sin tipo"}
                {compartidaCon.length > 0 && (
                  <span className="ml-2 text-amber-700">Misma hoja que la(s) fila(s) {compartidaCon.join(", ")}.</span>
                )}
              </p>
              <div className="h-[62vh] overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                {imgSel?.estado === "listo" ? (
                  <ImageZoomViewer
                    src={verOriginal && originales[filaSel.image_path] ? originales[filaSel.image_path] : imgSel.url}
                    alt={`Reclamación fila ${seleccion + 1}`}
                  />
                ) : (
                  <p className="p-8 text-sm text-slate-500">
                    {imgSel?.estado === "error" ? "No se pudo escanear esta imagen." : "Escaneando..."}
                  </p>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-sm">
                {verOriginal ? (
                  <button onClick={() => setVerOriginal(false)} className="text-brand-600 underline">Ver escaneada</button>
                ) : (
                  <button onClick={() => verOriginalDe(filaSel)} className="text-brand-600 underline">Comparar con la foto original</button>
                )}
                <button
                  onClick={() => pedir({ path: filaSel.image_path, claimId: filaSel.id }, { regenerar: true })}
                  className="text-brand-600 underline"
                >
                  Volver a escanear
                </button>
                {imgSel?.estado === "listo" && (
                  <a href={imgSel.url} download={`fila_${seleccion + 1}_${limpiarNombre(filaSel.afiliado_nombre || "reclamacion")}.jpg`} className="text-brand-600 underline">
                    Descargar esta imagen
                  </a>
                )}
                <Link href={`/reclamaciones/${filaSel.id}`} className="text-brand-600 underline">Revisar esta reclamación</Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {filas.map((fila, i) => {
                const img = imagenes[fila.image_path];
                return (
                  <button
                    key={fila.id}
                    onClick={() => { setSeleccion(i); setVerOriginal(false); }}
                    className="overflow-hidden rounded-lg border border-slate-200 text-left hover:border-brand-500"
                  >
                    <div className="relative aspect-[3/4] bg-slate-100">
                      {img?.estado === "listo" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img.url} alt="" className="h-full w-full object-contain" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-slate-400">
                          {img?.estado === "error" ? "Error" : "Escaneando..."}
                        </div>
                      )}
                      <span className="absolute left-1 top-1 rounded bg-slate-900/80 px-1.5 py-0.5 text-xs font-semibold text-white">
                        {i + 1}
                      </span>
                    </div>
                    <p className="truncate px-2 py-1 text-xs text-slate-600">{fila.afiliado_nombre || "Sin nombre"}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const btn =
  "rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50";
const btnPrimario =
  "rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50";

function descargar(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function limpiarNombre(s) {
  return String(s)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\w.-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 80);
}

// La fuente estándar del PDF solo cubre Latin-1 (acentos y ñ incluidos);
// cualquier otro carácter haría fallar el PDF entero.
function latin1(s) {
  return String(s).replace(/[^\x20-\x7E\xA0-\xFF]/g, "");
}
