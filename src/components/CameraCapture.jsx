"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function CameraCapture() {
  const router = useRouter();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);

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
        "No se pudo acceder a la cámara. Puedes subir la foto desde la galería."
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

    canvas.toBlob(
      (blob) => {
        setPreview(URL.createObjectURL(blob));
        uploadAndCreateClaim(blob);
      },
      "image/jpeg",
      0.9
    );
  }

  function handleFileInput(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    uploadAndCreateClaim(file);
  }

  async function uploadAndCreateClaim(fileOrBlob) {
    setUploading(true);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const fileName = `${crypto.randomUUID()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("reclamaciones-imagenes")
      .upload(fileName, fileOrBlob, { contentType: "image/jpeg" });

    if (uploadError) {
      setUploading(false);
      setCameraError(`No se pudo subir la imagen: ${uploadError.message}`);
      return;
    }

    const { data: claim, error: insertError } = await supabase
      .from("claims")
      .insert({
        image_path: fileName,
        status: "pendiente",
        digitized_by: user?.id ?? null,
      })
      .select("id")
      .single();

    setUploading(false);

    if (insertError) {
      setCameraError(`No se pudo crear la reclamación: ${insertError.message}`);
      return;
    }

    router.push(`/reclamaciones/${claim.id}`);
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-4 text-lg font-semibold text-slate-900">
        Capturar reclamación
      </h1>

      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-black">
        {!cameraError ? (
          <video ref={videoRef} autoPlay playsInline muted className="w-full" />
        ) : (
          <div className="flex aspect-[3/4] items-center justify-center p-6 text-center text-sm text-slate-300">
            {cameraError}
          </div>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />

      <div className="mt-4 flex flex-col gap-2">
        {cameraReady && (
          <button
            onClick={takePhoto}
            disabled={uploading}
            className="rounded-lg bg-brand-600 py-3 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {uploading ? "Subiendo..." : "📷 Tomar foto"}
          </button>
        )}

        <label className="cursor-pointer rounded-lg border border-slate-300 py-3 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
          Subir foto desde galería
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileInput}
            className="hidden"
            disabled={uploading}
          />
        </label>
      </div>

      {preview && uploading && (
        <p className="mt-3 text-center text-xs text-slate-400">
          Procesando imagen...
        </p>
      )}
    </div>
  );
}
