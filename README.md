# ServiReclaMed

Digitación y gestión de reclamaciones médicas manuscritas para entrega/subida
a ARS (Administradoras de Riesgos de Salud).

## El problema que resuelve

Las secretarias de los doctores llenan a mano el formulario de reclamación.
Alguien de la empresa recoge esos formularios, los **digita** para armar una
**"relación"** (un lote consolidado), y esa relación se entrega o se sube a
la ARS correspondiente. El riesgo principal es la letra difícil de leer: un
error de digitación en un monto o un código puede costar el rechazo del
reclamo.

Esta app no reemplaza al digitador — le da una herramienta más rigurosa:
imagen ampliable al lado del formulario, validación de campos obligatorios,
un botón para marcar campos "no se entiende" (para que el supervisor los
revise con más cuidado), y generación automática de la relación en Excel.

## Estrategia de costo (por fases)

El objetivo es operar en **$0/mes** el mayor tiempo posible:

- **Fase 1 (esta versión):** digitación 100% manual con validación
  estructural y visor de imagen con zoom. Sin IA, sin costo por reclamación.
- **Fase 2 (futuro, sigue siendo ~gratis):** pre-llenado de campos con un
  modelo de reconocimiento de escritura open-source (TrOCR / PaddleOCR)
  corriendo en un servidor propio — el humano siempre confirma. Costo fijo
  de hosting, no por imagen.
- **Fase 3 (futuro, pago solo si hace falta):** usar un modelo de visión
  pago (ej. Claude) *solo* en los campos que el digitador marcó como "no se
  entiende", nunca en la reclamación completa. El gasto queda proporcional a
  cuántos campos son realmente ilegibles, no al volumen total.

## Stack

- **Next.js (App Router)** + Tailwind — se sirve como PWA instalable, así
  funciona igual desde el navegador del celular (cámara) o desde una compu
  con webcam/cámara de documentos conectada. Esto evita tener que decidir
  "celular vs. cámara" de entrada: se prueban ambos con la misma app y se
  decide con datos reales de cuál da mejores fotos en la práctica.
- **Supabase** (proyecto separado y gratuito, org "Servireclamed", nada que
  ver con el proyecto de Dr. Víctor) — Postgres + Auth + Storage de
  imágenes.
- **ExcelJS** para generar la "relación" descargable.

## Flujo

1. `/capturar` — el digitador toma foto (o sube desde galería) del
   formulario en papel. Se sube a Storage y se crea una reclamación en
   estado `pendiente`.
2. `/reclamaciones/[id]` — pantalla dividida: imagen con zoom/pan a la
   izquierda, formulario estructurado a la derecha. Cada campo tiene un
   botón "¿No se entiende?" que lo marca para revisión posterior. No se
   puede marcar "revisado" sin llenar los campos obligatorios.
3. `/relaciones` — agrupa las reclamaciones ya revisadas por ARS, genera un
   lote (`relación`) y lo exporta a Excel listo para entregar o subir al
   portal de la ARS.

## Modelo de datos (genérico — punto de partida)

Los campos en `src/lib/claimFields.js` y la tabla `claims` son una
estructura típica de reclamación dominicana (afiliado, paciente, médico,
servicio, diagnóstico CIE-10, monto). **Esto se debe ajustar en cuanto
tengamos el formulario real** que llenan las secretarias y el formato real
de "relación" que ya usan — probablemente hay campos específicos por ARS
que no están contemplados todavía.

## Cómo correr localmente

```bash
npm install
cp .env.example .env.local   # ya trae la URL y llave pública del proyecto Supabase
npm run dev
```

## Primer usuario

Por ahora no hay pantalla de registro (es una herramienta interna, no
pública). Para crear el primer usuario:

1. Entra al dashboard de Supabase del proyecto → **Authentication → Users →
   Add user** (con email + password).
2. Ese usuario ya puede entrar en `/login`. Se le crea automáticamente su
   fila en `profiles` con rol `digitador`.
3. Para hacerlo `admin` o `supervisor`, actualiza la columna `role` en la
   tabla `profiles` desde el dashboard.

## Pendientes / decisiones abiertas

- [ ] Conseguir un formulario real en blanco (foto) y el formato real de
      "relación" de al menos una ARS, para ajustar el modelo de datos.
- [ ] Confirmar volumen de reclamaciones/día para decidir si la Fase 2/3 de
      IA algún día tiene sentido.
- [ ] Decidir permisos por rol (¿un supervisor debe aprobar antes de
      generar la relación?).
- [ ] Íconos PWA reales para instalar en pantalla de inicio (hoy hay un
      placeholder simple en `public/icons/icon.svg`).
- [ ] Despliegue en producción (Vercel es la opción más simple para
      Next.js, con capa gratuita).
