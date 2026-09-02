import { headers } from "next/headers";
import QRCode from "qrcode";

export default async function EscanearQR() {
  const headerList = await headers();
  const host = headerList.get("host");
  const protocol = host?.startsWith("localhost") ? "http" : "https";
  const url = `${protocol}://${host}/capturar`;

  const qrDataUrl = await QRCode.toDataURL(url, { margin: 1, width: 160 });

  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={qrDataUrl} alt="Código QR para capturar desde el celular" className="h-20 w-20" />
      <div>
        <p className="text-sm font-medium text-slate-800">Capturar desde el celular</p>
        <p className="text-xs text-slate-500">
          Escanea este código con la cámara de tu celular para abrir la
          pantalla de captura ahí, mientras sigues digitando aquí en la
          computadora.
        </p>
      </div>
    </div>
  );
}
