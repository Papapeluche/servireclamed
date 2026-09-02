"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function CameraCapture() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [flash, setFlash] = useState(false);
  // Capturas de esta sesión, más reciente primero. No se navega a ningún
  // lado al tomar una foto — la cámara se queda encendida para poder ir
  // pasando papel tras papel sin esperar entre uno y otro.
  const [capturas, setCapturas] = useState([]);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);

    // Destello breve para confirmar que se tomó la foto, sin tapar la
    // cámara ni obligar a esperar — se puede seguir capturando de una vez.
    setFlash(true);
    setTimeout(() => setFlash(false), 150);

    canvas.toBlob(
      (blob) => {
        const thumb = URL.createObjectURL(blob);
        addCaptura(thumb, blob);
      },
      "image/jpeg",
      0.9
    );
  }

  function handleFileInput(e) {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      addCaptura(URL.createObjectURL(file), file);
    }
    e.target.value = "";
  }

  function addCaptura(thumb, fileOrBlob) {
    const localId = crypto.randomUUID();
    setCapturas((prev) => [
      { localId, thumb, status: "subiendo", claimId: null, aiStatus: null },
      ...prev,
    ]);
    uploadAndCreateClaim(localId, fileOrBlob);
  }

  function updateCaptura(localId, patch) {
    setCapturas((prev) => prev.map((c) => (c.localId === localId ? { ...c, ...patch } : c)));
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

  const guardadas = capturas.filter((c) => c.status === "ok").length;
  const conError = capturas.filter((c) => c.status === "error").length;

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Capturar reclamaciones</h1>
        <Link href="/dashboard" className="text-xs text-brand-600 hover:underline">
          Ir al dashboard
        </Link>
      </div>

      <p className="mb-3 text-xs text-slate-500">
        La cámara se queda encendida — toma una foto, pasa a la siguiente
        reclamación en papel, y toma la próxima cuando estés listo. No hace
        falta esperar entre una y otra: cada foto se sube y se lee con IA
        en segundo plano, sin bloquear la siguiente captura.
      </p>

      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-black">
        {!cameraError ? (
          <video ref={videoRef} autoPlay playsInline muted className="w-full" />
        ) : (
          <div className="flex aspect-[3/4] items-center justify-center p-6 text-center text-sm text-slate-300">
            {cameraError}
          </div>
        )}
        {flash && <div className="absolute inset-0 bg-white/80" />}
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
            capture="environment"
            multiple
            onChange={handleFileInput}
            className="hidden"
          />
        </label>
      </div>

      {capturas.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs text-slate-500">
            {guardadas} guardada(s) en esta sesión
            {conError > 0 && <span className="text-red-600"> · {conError} con error</span>}
          </p>
          <div className="flex flex-wrap gap-2">
            {capturas.map((c) => (
              <CapturaThumb key={c.localId} captura={c} />
            ))}
          </div>
          <p className="mt-2 text-[10px] text-slate-400">
            🤖 leyendo · ✓ leída por IA · ⚠ leída pero revisa lo marcado · ✍
            IA no disponible, digitar a mano
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

function CapturaThumb({ captura }) {
  const aiBadge = captura.status === "ok" ? AI_BADGES[captura.aiStatus] : null;

  const content = (
    <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-slate-200">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={captura.thumb} alt="" className="h-full w-full object-cover" />
      {captura.status === "subiendo" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs text-white">
          ...
        </div>
      )}
      {captura.status === "error" && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-600/70 text-xs text-white">
          ✕
        </div>
      )}
      {aiBadge && (
        <div
          className={`absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-tl-lg text-xs text-white ${aiBadge.className}`}
        >
          {aiBadge.icon}
        </div>
      )}
    </div>
  );

  if (captura.status === "ok" && captura.claimId) {
    return <Link href={`/reclamaciones/${captura.claimId}`}>{content}</Link>;
  }
  return content;
}
