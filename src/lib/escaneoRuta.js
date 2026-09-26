// Si cambia el algoritmo de escaneo (src/lib/escaneo.js), subir la versión:
// el caché de escaneos en Storage vive bajo esta versión, así que los
// escaneos viejos se regeneran solos la próxima vez que se abran.
export const VERSION_ESCANEO = "v1";

export function rutaEscaneo(imagePath) {
  return `escaneados/${VERSION_ESCANEO}/${imagePath}`;
}
