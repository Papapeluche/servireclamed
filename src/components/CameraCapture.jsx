"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { subirAnexo, quitarAnexo, aJpeg } from "@/lib/anexos";

// Detección de "papel quieto" para disparar la captura sola — no lee el
// contenido (eso lo hace la IA después), solo nota cuándo la cámara dejó
// de moverse sobre algo que no es una superficie en blanco. 100% en el
// navegador, sin costo, sin ninguna llamada externa.
const DETECT_SIZE = 40; // downscale a 40x40 para que comparar cuadros sea barato
const DETECT_INTERVAL_MS = 300;
const STILL_DIFF_THRESHOLD = 8; // diferencia promedio por píxel (0-255) para considerarlo "quieto"
const STILL_TICKS_NEEDED = 3; // ~900ms quieto antes de disparar
const MIN_CONTENT_VARIANCE = 12; // evita disparar apuntando a una superficie lisa/en blanco
const COOLDOWN_MS = 2000; // pausa después de cada auto-captura, para dar tiempo a cambiar de papel

export default function CameraCapture() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const detectCanvasRef = useRef(null);
  const prevFrameRef = useRef(null);
  const stillTicksRef = useRef(0);
  const cooldownRef = useRef(false);
  const detectTimerRef = useRef(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [flash, setFlash] = useState(false);
  const [autoCapture, setAutoCapture] = useState(true);
  const [autoStatus, setAutoStatus] = useState("esperando"); // esperando | quieto | pausa
  // Capturas de esta sesión, más reciente primero. No se navega a ningún
  // lado al tomar una foto — la cámara se queda encendida para poder ir
  // pasando papel tras papel sin esperar entre uno y otro.
  const [capturas, setCapturas] = useState([]);
  // Modo anexos: mientras está activo, cada foto se pega como anexo a esta
  // reclamación en vez de crear una nueva. Se guarda también en una ref
  // porque la captura automática corre en un temporizador creado una sola
  // vez, que si no seguiría viendo el valor viejo.
  const [modoAnexos, setModoAnexos] = useState(null); // { localId, claimId, numero }
  const modoAnexosRef = useRef(null);
  const numeroRef = useRef(0);

  function cambiarModoAnexos(valor) {
    modoAnexosRef.current = valor;
    setModoAnexos(valor);
  }

  useEffect(() => {
    startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!cameraReady || !autoCapture) {
      clearInterval(detectTimerRef.current);
      prevFrameRef.current = null;
      stillTicksRef.current = 0;
      return;
    }
    detectTimerRef.current = setInterval(checkStillness, DETECT_INTERVAL_MS);
    return () => clearInterval(detectTimerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraReady, autoCapture]);

  function checkStillness() {
    if (cooldownRef.current) return;

    const video = videoRef.current;
    if (!video || video.readyState < 2) return;

    if (!detectCanvasRef.current) {
      detectCanvasRef.current = document.createElement("canvas");
      detectCanvasRef.current.width = DETECT_SIZE;
      detectCanvasRef.current.height = DETECT_SIZE;
    }
    const ctx = detectCanvasRef.current.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(video, 0, 0, DETECT_SIZE, DETECT_SIZE);
    const frame = ctx.getImageData(0, 0, DETECT_SIZE, DETECT_SIZE).data;

    // Escala de grises por píxel, para comparar cuadros barato.
    const gray = new Uint8ClampedArray(DETECT_SIZE * DETECT_SIZE);
    for (let i = 0; i < gray.length; i++) {
      const o = i * 4;
      gray[i] = (frame[o] + frame[o + 1] + frame[o + 2]) / 3;
    }

    let variance = 0;
    const mean = gray.reduce((a, b) => a + b, 0) / gray.length;
    for (const g of gray) variance += (g - mean) ** 2;
    variance /= gray.length;

    const prev = prevFrameRef.current;
    prevFrameRef.current = gray;

    if (!prev || variance < MIN_CONTENT_VARIANCE) {
      stillTicksRef.current = 0;
      setAutoStatus("esperando");
      return;
    }

    let diffSum = 0;
    for (let i = 0; i < gray.length; i++) diffSum += Math.abs(gray[i] - prev[i]);
    const avgDiff = diffSum / gray.length;

    if (avgDiff < STILL_DIFF_THRESHOLD) {
      stillTicksRef.current += 1;
      setAutoStatus("quieto");
    } else {
      stillTicksRef.current = 0;
      setAutoStatus("esperando");
    }

    if (stillTicksRef.current >= STILL_TICKS_NEEDED) {
      stillTicksRef.current = 0;
      cooldownRef.current = true;
      setAutoStatus("pausa");
      takePhoto();
      setTimeout(() => {
        cooldownRef.current = false;
        setAutoStatus("esperando");
      }, COOLDOWN_MS);
    }
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraReady(true);
    } catch (err) {
      setCameraError(
        "No se pudo acceder a la cámara. Puedes subir las fotos desde la galería."
      );
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }

  function takePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    // La cámara todavía no manda imagen (recién abierta): no hay nada que tomar.
    if (!video || !canvas || !video.videoWidth) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);

    // Destello breve para confirmar que se tomó la foto, sin tapar la
    // cámara ni obligar a esperar — se puede seguir capturando de una vez.
    setFlash(true);
    setTimeout(() => setFlash(false), 150);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const thumb = URL.createObjectURL(blob);
        addCaptura(thumb, blob);
      },
      "image/jpeg",
      0.9
    );
  }

  async function handleFileInput(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    for (const file of files) {
      const jpeg = await aJpeg(file);
      addCaptura(URL.createObjectURL(jpeg), jpeg);
    }
  }

  function addCaptura(thumb, fileOrBlob) {
    const localId = crypto.randomUUID();
    const padre = modoAnexosRef.current;
    if (padre) {
      setCapturas((prev) => [
        { localId, thumb, tipo: "anexo", status: "subiendo", claimId: padre.claimId, padreLocalId: padre.localId, numero: padre.numero },
        ...prev,
      ]);
      subirAnexo(createClient(), padre.claimId, fileOrBlob)
        .then((anexo) => updateCaptura(localId, { status: "ok", anexoId: anexo.id }))
        .catch(() => updateCaptura(localId, { status: "error" }));
      return;
    }
    const numero = ++numeroRef.current;
    setCapturas((prev) => [
      { localId, thumb, tipo: "reclamacion", numero, status: "subiendo", claimId: null, aiStatus: null },
      ...prev,
    ]);
    uploadAndCreateClaim(localId, fileOrBlob);
  }

  function updateCaptura(localId, patch) {
    setCapturas((prev) => prev.map((c) => (c.localId === localId ? { ...c, ...patch } : c)));
  }

  async function borrarCaptura(captura) {
    if (captura.tipo === "anexo") {
      if (!confirm("¿Quitar este anexo? No se puede deshacer.")) return;
      if (!captura.anexoId) {
        setCapturas((prev) => prev.filter((c) => c.localId !== captura.localId));
        return;
      }
      updateCaptura(captura.localId, { status: "borrando" });
      try {
        await quitarAnexo(captura.claimId, captura.anexoId);
        setCapturas((prev) => prev.filter((c) => c.localId !== captura.localId));
      } catch (e) {
        alert(e.message);
        updateCaptura(captura.localId, { status: "ok" });
      }
      return;
    }

    const anexos = capturas.filter((c) => c.padreLocalId === captura.localId).length;
    const extra = anexos ? ` y sus ${anexos} anexo(s)` : "";
    if (!confirm(`¿Borrar esta reclamación${extra}? No se puede deshacer.`)) return;
    if (modoAnexosRef.current?.localId === captura.localId) cambiarModoAnexos(null);

    if (!captura.claimId) {
      // Nunca llegó a crearse la reclamación (falló la subida) — solo hay
      // que quitarla de la lista local, no hay nada que borrar en el servidor.
      setCapturas((prev) => prev.filter((c) => c.localId !== captura.localId));
      return;
    }

    updateCaptura(captura.localId, { status: "borrando" });
    try {
      const res = await fetch(`/api/claims/${captura.claimId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "No se pudo borrar esta foto.");
        updateCaptura(captura.localId, { status: "ok" });
        return;
      }
      setCapturas((prev) =>
        prev.filter((c) => c.localId !== captura.localId && c.padreLocalId !== captura.localId)
      );
    } catch {
      alert("No se pudo borrar esta foto — revisa tu conexión.");
      updateCaptura(captura.localId, { status: "ok" });
    }
  }

  async function uploadAndCreateClaim(localId, fileOrBlob) {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const fileName = `${crypto.randomUUID()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("reclamaciones-imagenes")
      .upload(fileName, fileOrBlob, { contentType: "image/jpeg" });

    if (uploadError) {
      updateCaptura(localId, { status: "error" });
      return;
    }

    const { data: claim, error: insertError } = await supabase
      .from("claims")
      .insert({
        image_path: fileName,
        status: "pendiente",
        captured_by: user?.id ?? null,
      })
      .select("id")
      .single();

    if (insertError) {
      updateCaptura(localId, { status: "error" });
      return;
    }

    updateCaptura(localId, { status: "ok", claimId: claim.id, aiStatus: "analizando" });
    analizarConIA(localId, claim.id);
  }

  // No bloquea nada — sigue corriendo en segundo plano mientras se puede
  // seguir capturando la siguiente reclamación. Si falla o no está
  // configurada la IA, la reclamación queda igual que antes (para digitar
  // a mano), solo cambia el estado que se muestra en la miniatura.
  async function analizarConIA(localId, claimId) {
    try {
      const res = await fetch(`/api/claims/${claimId}/analizar`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        updateCaptura(localId, { aiStatus: "no_disponible" });
        return;
      }
      updateCaptura(localId, { aiStatus: data.inciertos > 0 ? "revisar" : "listo" });
    } catch {
      updateCaptura(localId, { aiStatus: "no_disponible" });
    }
  }

  const guardadas = capturas.filter((c) => c.tipo === "reclamacion" && c.status === "ok").length;
  const anexosGuardados = capturas.filter((c) => c.tipo === "anexo" && c.status === "ok").length;
  const conError = capturas.filter((c) => c.status === "error").length;
  // La reclamación más reciente: a ella se le agregan los anexos.
  const ultima = capturas.find((c) => c.tipo === "reclamacion");
  const anexosDe = (localId) => capturas.filter((c) => c.padreLocalId === localId).length;

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Capturar reclamaciones</h1>
        <Link href="/dashboard" className="text-xs text-brand-600 hover:underline">
          Ir al dashboard
        </Link>
      </div>

      <p className="mb-3 text-xs text-slate-500">
        {autoCapture
          ? "Captura automática activada: pon un papel frente a la cámara, sostenla quieta un momento y se toma la foto sola. Pasa al siguiente papel cuando quieras."
          : "Captura manual: toma la foto tú mismo cuando estés listo."}{" "}
        Cada foto se sube y se lee con IA en segundo plano, sin bloquear la
        siguiente captura.
      </p>

      <label className="mb-3 flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={autoCapture}
          onChange={(e) => setAutoCapture(e.target.checked)}
        />
        Captura automática (sin tocar el botón)
      </label>

      {modoAnexos ? (
        <div className="mb-3 rounded-lg border-2 border-amber-400 bg-amber-50 p-3 text-sm text-amber-900">
          <p>
            📎 <strong>Modo anexos:</strong> cada foto se agrega a la reclamación{" "}
            <strong>#{modoAnexos.numero}</strong> ({anexosDe(modoAnexos.localId)} anexo(s) hasta ahora).
          </p>
          <button
            onClick={() => cambiarModoAnexos(null)}
            className="mt-2 w-full rounded-lg bg-amber-500 py-2 font-medium text-white hover:bg-amber-600"
          >
            ✓ Listo, siguiente reclamación
          </button>
        </div>
      ) : (
        ultima && (
          <button
            onClick={() =>
              cambiarModoAnexos({ localId: ultima.localId, claimId: ultima.claimId, numero: ultima.numero })
            }
            disabled={ultima.status !== "ok"}
            className="mb-3 w-full rounded-lg border-2 border-dashed border-amber-400 py-2 text-sm font-medium text-amber-800 hover:bg-amber-50 disabled:opacity-50"
          >
            {ultima.status === "ok"
              ? `📎 Agregar anexos a la reclamación #${ultima.numero}`
              : "📎 Agregar anexos (esperando que termine de subir...)"}
          </button>
        )
      )}

      <div
        className={`relative overflow-hidden rounded-xl border-4 bg-black transition-colors ${
          modoAnexos
            ? "border-amber-400"
            : autoCapture && autoStatus === "quieto"
            ? "border-emerald-400"
            : autoCapture && autoStatus === "pausa"
              ? "border-brand-500"
              : "border-slate-200"
        }`}
      >
        {!cameraError ? (
          <video ref={videoRef} autoPlay playsInline muted className="w-full" />
        ) : (
          <div className="flex aspect-[3/4] items-center justify-center p-6 text-center text-sm text-slate-300">
            {cameraError}
          </div>
        )}
        {flash && <div className="absolute inset-0 bg-white/80" />}
        {modoAnexos && (
          <div className="absolute left-2 top-2 rounded-full bg-amber-500 px-3 py-1 text-xs font-medium text-white">
            📎 Anexos de #{modoAnexos.numero}
          </div>
        )}
        {autoCapture && cameraReady && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
            {autoStatus === "quieto" && "Quieta... capturando"}
            {autoStatus === "pausa" && "📷 Capturada — cambia de papel"}
            {autoStatus === "esperando" && "Buscando un papel quieto..."}
          </div>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />

      <div className="mt-4 flex flex-col gap-2">
        {cameraReady && (
          <button
            onClick={takePhoto}
            className="rounded-lg bg-brand-600 py-4 text-base font-medium text-white hover:bg-brand-700 active:bg-brand-700"
          >
            📷 Tomar foto
          </button>
        )}

        <label className="cursor-pointer rounded-lg border border-slate-300 py-3 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
          Subir fotos desde galería
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileInput}
            className="hidden"
          />
        </label>
      </div>

      {capturas.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs text-slate-500">
            {guardadas} reclamación(es){anexosGuardados > 0 && ` · ${anexosGuardados} anexo(s)`} en esta sesión
            {conError > 0 && <span className="text-red-600"> · {conError} con error</span>}
          </p>
          <div className="flex flex-wrap gap-2">
            {capturas.map((c) => (
              <CapturaThumb key={c.localId} captura={c} anexos={anexosDe(c.localId)} onDelete={borrarCaptura} />
            ))}
          </div>
          <p className="mt-2 text-[10px] text-slate-400">
            🤖 leyendo · ✓ leída por IA · ⚠ leída pero revisa lo marcado · ✍
            IA no disponible, digitar a mano · 📎 anexo (borde amarillo)
          </p>
        </div>
      )}
    </div>
  );
}

const AI_BADGES = {
  analizando: { icon: "🤖", className: "bg-blue-500" },
  listo: { icon: "✓", className: "bg-emerald-500" },
  revisar: { icon: "⚠", className: "bg-warn-500" },
  no_disponible: { icon: "✍", className: "bg-slate-500" },
};

function CapturaThumb({ captura, anexos = 0, onDelete }) {
  const esAnexo = captura.tipo === "anexo";
  const aiBadge = captura.status === "ok" && !esAnexo ? AI_BADGES[captura.aiStatus] : null;
  const puedeBorrar = captura.status === "ok" || captura.status === "error";

  const content = (
    <div
      className={`relative h-16 w-16 overflow-hidden rounded-lg ${
        esAnexo ? "border-2 border-amber-400" : "border border-slate-200"
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={captura.thumb} alt="" className="h-full w-full object-cover" />
      {captura.status === "subiendo" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs text-white">
          ...
        </div>
      )}
      {captura.status === "borrando" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs text-white">
          ...
        </div>
      )}
      {captura.status === "error" && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-600/70 text-xs text-white">
          ✕
        </div>
      )}
      <div className="absolute left-0 top-0 rounded-br-md bg-slate-900/75 px-1 text-[10px] font-semibold text-white">
        {esAnexo ? `📎#${captura.numero}` : `#${captura.numero}`}
        {!esAnexo && anexos > 0 && ` 📎${anexos}`}
      </div>
      {aiBadge && (
        <div
          className={`absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-tl-lg text-xs text-white ${aiBadge.className}`}
        >
          {aiBadge.icon}
        </div>
      )}
    </div>
  );

  return (
    <div className="relative">
      {captura.status === "ok" && captura.claimId ? (
        <Link href={`/reclamaciones/${captura.claimId}`}>{content}</Link>
      ) : (
        content
      )}
      {puedeBorrar && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(captura);
          }}
          title="Borrar esta foto"
          className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-xs text-white shadow hover:bg-red-600"
        >
          ✕
        </button>
      )}
    </div>
  );
}
