import sharp from "sharp";

// Convierte la foto de una reclamación en algo que parezca escaneado, al
// estilo CamScanner: detecta la hoja, la recorta y endereza (corrige la
// perspectiva de una foto tomada en ángulo), aplana la iluminación (quita
// sombras y el sombreado que dejan los pliegues), blanquea el fondo, oscurece
// la tinta y sube la resolución. Solo transforma píxeles: no genera ni
// sustituye texto, y la foto original sigue intacta en Storage.
// Si cambia el algoritmo, subir VERSION_ESCANEO en src/lib/escaneoRuta.js.

const MAX_LADO = 2400; // resolución de trabajo; sobra para leer un formulario
const DETECT_LADO = 480; // la detección de la hoja se hace en miniatura
const ANCHO_MIN_SALIDA = 1700; // ~A4 a 200 ppp

export async function escanearDocumento(input) {
  const { data, info } = await sharp(input, { failOn: "none" })
    .rotate()
    .resize({ width: MAX_LADO, height: MAX_LADO, fit: "inside", withoutEnlargement: true })
    .removeAlpha()
    .toColourspace("srgb")
    .raw()
    .toBuffer({ resolveWithObject: true });

  let img = { data, width: info.width, height: info.height, channels: info.channels };
  if (img.channels !== 3) img = aRGB(img);

  const esquinas = detectarHoja(img);
  if (esquinas) img = enderezar(img, esquinas);

  const limpio = normalizarIluminacion(img);

  let salida = sharp(limpio.data, {
    raw: { width: limpio.width, height: limpio.height, channels: 3 },
  });
  if (limpio.width < ANCHO_MIN_SALIDA) {
    salida = salida.resize({ width: ANCHO_MIN_SALIDA, kernel: "lanczos3" });
  }
  const bytes = await salida
    .sharpen({ sigma: 0.8 })
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();

  return { bytes, recortado: Boolean(esquinas) };
}

function aRGB({ data, width, height, channels }) {
  const out = Buffer.alloc(width * height * 3);
  for (let i = 0; i < width * height; i++) {
    const v = data[i * channels];
    out[i * 3] = out[i * 3 + 1] = out[i * 3 + 2] = v;
  }
  return { data: out, width, height, channels: 3 };
}

function luminancia(data, i) {
  return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
}

// Devuelve las 4 esquinas de la hoja (en píxeles de la imagen de trabajo),
// o null si no se encuentra una hoja clara — en ese caso no se recorta nada
// (es preferible no recortar a recortar mal y perder parte del formulario).
function detectarHoja({ data, width, height }) {
  const s = Math.min(1, DETECT_LADO / Math.max(width, height));
  const w = Math.max(8, Math.round(width * s));
  const h = Math.max(8, Math.round(height * s));
  const n = w * h;

  const gris = new Float32Array(n);
  for (let y = 0; y < h; y++) {
    const sy = Math.min(height - 1, Math.floor(y / s));
    for (let x = 0; x < w; x++) {
      const sx = Math.min(width - 1, Math.floor(x / s));
      gris[y * w + x] = luminancia(data, (sy * width + sx) * 3);
    }
  }
  const suave = desenfoqueCaja(gris, w, h, 2);

  // Umbral de Otsu: separa la hoja (clara) del fondo (mesa, más oscura).
  const hist = new Array(256).fill(0);
  for (let i = 0; i < n; i++) hist[Math.min(255, Math.round(suave[i]))]++;
  const umbral = otsu(hist, n);
  const claro = new Uint8Array(n);
  for (let i = 0; i < n; i++) claro[i] = suave[i] > umbral ? 1 : 0;

  // Fondo = lo oscuro conectado con el borde de la foto. Todo lo demás es
  // "hoja", incluido el texto oscuro que queda rodeado de papel.
  const fondo = new Uint8Array(n);
  const cola = new Int32Array(n);
  let ini = 0, fin = 0;
  const sembrar = (i) => {
    if (!claro[i] && !fondo[i]) { fondo[i] = 1; cola[fin++] = i; }
  };
  for (let x = 0; x < w; x++) { sembrar(x); sembrar((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { sembrar(y * w); sembrar(y * w + w - 1); }
  while (ini < fin) {
    const i = cola[ini++];
    const x = i % w, y = (i / w) | 0;
    if (x > 0) sembrar(i - 1);
    if (x < w - 1) sembrar(i + 1);
    if (y > 0) sembrar(i - w);
    if (y < h - 1) sembrar(i + w);
  }

  // Componente más grande de "hoja".
  const visto = new Uint8Array(n);
  let mejor = null;
  for (let i0 = 0; i0 < n; i0++) {
    if (fondo[i0] || visto[i0]) continue;
    ini = 0; fin = 0;
    visto[i0] = 1; cola[fin++] = i0;
    let area = 0;
    let tl = null, tr = null, br = null, bl = null;
    let vTl = Infinity, vBr = -Infinity, vTr = -Infinity, vBl = Infinity;
    while (ini < fin) {
      const i = cola[ini++];
      const x = i % w, y = (i / w) | 0;
      area++;
      if (x + y < vTl) { vTl = x + y; tl = [x, y]; }
      if (x + y > vBr) { vBr = x + y; br = [x, y]; }
      if (x - y > vTr) { vTr = x - y; tr = [x, y]; }
      if (x - y < vBl) { vBl = x - y; bl = [x, y]; }
      const vecinos = [];
      if (x > 0) vecinos.push(i - 1);
      if (x < w - 1) vecinos.push(i + 1);
      if (y > 0) vecinos.push(i - w);
      if (y < h - 1) vecinos.push(i + w);
      for (const j of vecinos) {
        if (!fondo[j] && !visto[j]) { visto[j] = 1; cola[fin++] = j; }
      }
    }
    if (!mejor || area > mejor.area) mejor = { area, esquinas: [tl, tr, br, bl] };
  }
  if (!mejor) return null;

  const [tl, tr, br, bl] = mejor.esquinas;
  const areaQuad = areaPoligono([tl, tr, br, bl]);
  // La hoja ocupa casi toda la foto: ya viene "encuadrada", no hace falta recortar.
  if (areaQuad > 0.9 * n) return null;
  // Muy pequeña, o la forma no se parece a un rectángulo (un objeto irregular).
  if (areaQuad < 0.2 * n) return null;
  if (mejor.area / areaQuad < 0.85) return null;
  if (!esConvexo([tl, tr, br, bl])) return null;
  const arriba = dist(tl, tr), abajo = dist(bl, br), izq = dist(tl, bl), der = dist(tr, br);
  const razon = (a, b) => Math.max(a, b) / Math.max(1, Math.min(a, b));
  if (razon(arriba, abajo) > 1.6 || razon(izq, der) > 1.6) return null;
  // Cada lado tiene que ser un borde de verdad (salto brusco papel/mesa), no
  // el límite difuso de una sombra: con una sombra fuerte, parte de la hoja
  // se oscurece tanto como la mesa y, sin esto, se recortaría media hoja.
  if (!bordesReales([tl, tr, br, bl], suave, w, h)) return null;

  return [tl, tr, br, bl].map(([x, y]) => [(x + 0.5) / s, (y + 0.5) / s]);
}

function bordesReales(quad, gris, w, h) {
  const cx = quad.reduce((a, p) => a + p[0], 0) / 4;
  const cy = quad.reduce((a, p) => a + p[1], 0) / 4;
  const K = 5;
  const val = (x, y) => gris[Math.round(y) * w + Math.round(x)];
  const dentro = (x, y) => x >= 0 && y >= 0 && x <= w - 1 && y <= h - 1;
  for (let i = 0; i < 4; i++) {
    const [ax, ay] = quad[i];
    const [bx, by] = quad[(i + 1) % 4];
    const len = Math.hypot(bx - ax, by - ay) || 1;
    let nx = -(by - ay) / len, ny = (bx - ax) / len;
    const mx = (ax + bx) / 2, my = (ay + by) / 2;
    if ((cx - mx) * nx + (cy - my) * ny < 0) { nx = -nx; ny = -ny; } // n apunta hacia la hoja
    const saltos = [];
    let pegadoAlBorde = 0, muestras = 0;
    for (let t = 0.1; t <= 0.9; t += 0.04) {
      const px = ax + (bx - ax) * t, py = ay + (by - ay) * t;
      const inX = px + nx * K, inY = py + ny * K, outX = px - nx * K, outY = py - ny * K;
      if (!dentro(inX, inY)) continue;
      muestras++;
      // El lado coincide con el borde de la foto (la hoja se sale del cuadro):
      // no hay "afuera" que medir, y ese lado se da por bueno.
      if (!dentro(outX, outY)) { pegadoAlBorde++; continue; }
      saltos.push(val(inX, inY) - val(outX, outY));
    }
    if (!muestras) return false;
    if (pegadoAlBorde / muestras > 0.6) continue;
    if (saltos.length < 5) return false;
    saltos.sort((a, b) => a - b);
    const mediana = saltos[saltos.length >> 1];
    const firmes = saltos.filter((d) => d >= 8).length / saltos.length;
    if (mediana < 14 || firmes < 0.75) return false;
  }
  return true;
}

function otsu(hist, total) {
  let suma = 0;
  for (let i = 0; i < 256; i++) suma += i * hist[i];
  let sumaB = 0, pesoB = 0, mejorVar = -1, umbral = 127;
  for (let t = 0; t < 256; t++) {
    pesoB += hist[t];
    if (!pesoB) continue;
    const pesoF = total - pesoB;
    if (!pesoF) break;
    sumaB += t * hist[t];
    const mB = sumaB / pesoB, mF = (suma - sumaB) / pesoF;
    const v = pesoB * pesoF * (mB - mF) ** 2;
    if (v > mejorVar) { mejorVar = v; umbral = t; }
  }
  return umbral;
}

function desenfoqueCaja(src, w, h, r) {
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0, c = 0;
      for (let k = Math.max(0, x - r); k <= Math.min(w - 1, x + r); k++) { s += src[y * w + k]; c++; }
      tmp[y * w + x] = s / c;
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0, c = 0;
      for (let k = Math.max(0, y - r); k <= Math.min(h - 1, y + r); k++) { s += tmp[k * w + x]; c++; }
      out[y * w + x] = s / c;
    }
  }
  return out;
}

function dist([ax, ay], [bx, by]) {
  return Math.hypot(ax - bx, ay - by);
}

function areaPoligono(p) {
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const [x1, y1] = p[i];
    const [x2, y2] = p[(i + 1) % p.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2;
}

function esConvexo(p) {
  let signo = 0;
  for (let i = 0; i < p.length; i++) {
    const [ax, ay] = p[i];
    const [bx, by] = p[(i + 1) % p.length];
    const [cx, cy] = p[(i + 2) % p.length];
    const cruz = (bx - ax) * (cy - by) - (by - ay) * (cx - bx);
    if (cruz === 0) return false;
    if (!signo) signo = Math.sign(cruz);
    else if (Math.sign(cruz) !== signo) return false;
  }
  return true;
}

// Transformación de perspectiva: lleva el cuadrilátero de la hoja a un
// rectángulo derecho (como si la foto se hubiera tomado de frente).
function enderezar({ data, width, height }, [tl, tr, br, bl]) {
  let wo = Math.round((dist(tl, tr) + dist(bl, br)) / 2);
  let ho = Math.round((dist(tl, bl) + dist(tr, br)) / 2);
  const escala = Math.min(1, MAX_LADO / Math.max(wo, ho));
  wo = Math.max(1, Math.round(wo * escala));
  ho = Math.max(1, Math.round(ho * escala));

  const H = homografia(
    [[0, 0], [wo - 1, 0], [wo - 1, ho - 1], [0, ho - 1]],
    [tl, tr, br, bl]
  );
  const out = Buffer.alloc(wo * ho * 3);
  for (let v = 0; v < ho; v++) {
    for (let u = 0; u < wo; u++) {
      const d = H[6] * u + H[7] * v + 1;
      let x = (H[0] * u + H[1] * v + H[2]) / d;
      let y = (H[3] * u + H[4] * v + H[5]) / d;
      x = Math.min(width - 1.001, Math.max(0, x));
      y = Math.min(height - 1.001, Math.max(0, y));
      const x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0;
      const i00 = (y0 * width + x0) * 3, i10 = i00 + 3, i01 = i00 + width * 3, i11 = i01 + 3;
      const o = (v * wo + u) * 3;
      for (let c = 0; c < 3; c++) {
        const a = data[i00 + c] + (data[i10 + c] - data[i00 + c]) * fx;
        const b = data[i01 + c] + (data[i11 + c] - data[i01 + c]) * fx;
        out[o + c] = a + (b - a) * fy;
      }
    }
  }
  return { data: out, width: wo, height: ho, channels: 3 };
}

// Resuelve la homografía (8 incógnitas) que lleva cada punto de `desde` a su
// punto en `hasta`, por eliminación de Gauss.
function homografia(desde, hasta) {
  const A = [];
  for (let i = 0; i < 4; i++) {
    const [u, v] = desde[i];
    const [x, y] = hasta[i];
    A.push([u, v, 1, 0, 0, 0, -u * x, -v * x, x]);
    A.push([0, 0, 0, u, v, 1, -u * y, -v * y, y]);
  }
  for (let col = 0; col < 8; col++) {
    let piv = col;
    for (let r = col + 1; r < 8; r++) if (Math.abs(A[r][col]) > Math.abs(A[piv][col])) piv = r;
    [A[col], A[piv]] = [A[piv], A[col]];
    for (let r = 0; r < 8; r++) {
      if (r === col) continue;
      const f = A[r][col] / A[col][col];
      for (let k = col; k < 9; k++) A[r][k] -= f * A[col][k];
    }
  }
  return A.map((fila, i) => fila[8] / fila[i]);
}

// Aplana la iluminación: estima el "papel sin nada escrito" (el brillo del
// fondo, con sus sombras y el sombreado de los pliegues) y divide la imagen
// entre él. Lo que queda es el papel parejo y blanco con la tinta encima.
// Después oscurece un poco la tinta para que se lea como un escaneo nítido.
function normalizarIluminacion({ data, width, height }) {
  const F = 8; // el fondo se estima en una rejilla 8 veces más pequeña
  const bw = Math.ceil(width / F), bh = Math.ceil(height / F);
  const bloque = new Float32Array(bw * bh);
  // El máximo de cada bloque ignora la tinta (oscura) y se queda con el papel.
  for (let by = 0; by < bh; by++) {
    for (let bx = 0; bx < bw; bx++) {
      let m = 0;
      for (let y = by * F; y < Math.min(height, (by + 1) * F); y++) {
        for (let x = bx * F; x < Math.min(width, (bx + 1) * F); x++) {
          const l = luminancia(data, (y * width + x) * 3);
          if (l > m) m = l;
        }
      }
      bloque[by * bw + bx] = m;
    }
  }
  // Dilatación: borra trazos y palabras más anchos que un bloque.
  const dil = new Float32Array(bw * bh);
  const R = 2;
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      let m = 0;
      for (let yy = Math.max(0, y - R); yy <= Math.min(bh - 1, y + R); yy++) {
        for (let xx = Math.max(0, x - R); xx <= Math.min(bw - 1, x + R); xx++) {
          if (bloque[yy * bw + xx] > m) m = bloque[yy * bw + xx];
        }
      }
      dil[y * bw + x] = m;
    }
  }
  const fondo = desenfoqueCaja(desenfoqueCaja(dil, bw, bh, 3), bw, bh, 3);

  const out = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++) {
    const gy = Math.min(bh - 1.001, Math.max(0, (y + 0.5) / F - 0.5));
    const y0 = gy | 0, fy = gy - y0, y1 = Math.min(bh - 1, y0 + 1);
    for (let x = 0; x < width; x++) {
      const gx = Math.min(bw - 1.001, Math.max(0, (x + 0.5) / F - 0.5));
      const x0 = gx | 0, fx = gx - x0, x1 = Math.min(bw - 1, x0 + 1);
      const a = fondo[y0 * bw + x0] + (fondo[y0 * bw + x1] - fondo[y0 * bw + x0]) * fx;
      const b = fondo[y1 * bw + x0] + (fondo[y1 * bw + x1] - fondo[y1 * bw + x0]) * fx;
      const bg = Math.max(24, a + (b - a) * fy);
      const i = (y * width + x) * 3;
      for (let c = 0; c < 3; c++) {
        let t = data[i + c] / bg;
        // Papel casi blanco -> blanco puro (quita manchas y grano).
        t = t >= 0.9 ? 1 : Math.pow(t / 0.9, 1.35);
        out[i + c] = Math.max(0, Math.min(255, Math.round(t * 255)));
      }
    }
  }
  return { data: out, width, height, channels: 3 };
}
