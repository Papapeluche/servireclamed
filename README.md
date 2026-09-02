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
3. `/relaciones` — agrupa las reclamaciones ya revisadas por **ARS + médico**
   (igual que el formato real de Senasa: un bloque de encabezado del médico
   más una fila por reclamación), genera el lote (`relación`) y lo exporta a
   Excel listo para entregar o subir al portal de la ARS.
4. `/plantillas` — la relación de salida que se entrega es, en la práctica,
   **la misma para todas las ARS** (lo que varía entre ellas es el
   formulario de reclamación que reciben, no cómo se entrega la relación).
   Por eso normalmente basta con **una sola plantilla genérica** (sin ARS
   asignada): qué campos van en el encabezado (datos del médico, una vez
   por relación), qué columnas van en la tabla (una por reclamación), con
   qué etiqueta y en qué orden. Esa plantilla genérica se usa para cualquier
   ARS que no tenga una propia; solo hace falta crear una específica si de
   verdad alguna ARS pide un formato de entrega distinto. El mismo editor
   sirve para una futura **"hoja de presentación"** — un tipo de plantilla
   aparte que se activa cuando el usuario comparta ese formato real; por
   ahora solo queda guardada, sin exportación propia todavía.

5. `/medicos` — catálogo de médicos con su **código por ARS** (el código de
   un médico no es el mismo en todas las ARS — se confirmó al cargar la
   primera lista real, de CMD). Al digitar una reclamación, si el médico ya
   está en el catálogo, sus datos (código para esa ARS, cédula,
   especialidad, centro) se auto-completan en vez de tener que escribirlos
   a mano cada vez — menos digitación, menos error.

Un mismo formulario en papel a veces trae **más de un procedimiento** (visto
en Humano y ARS-UASD) — desde `/reclamaciones/[id]` hay un botón "+ Otra
línea de esta misma imagen" que crea una segunda reclamación reutilizando la
misma foto, en vez de forzar a tomarla de nuevo.

## Campos reales (no genéricos) — basado en documentos que compartió el usuario

Se revisaron formularios reales de **9 ARS distintas**:

- **ARS Amor y Paz** (red ASEMAP) — formulario individual en papel.
- **ARS Senasa** — su formulario individual ("Formulario de Reclamaciones
  Médicas") y dos relaciones ya digitadas (el formato de salida: un bloque
  con los datos del médico, una tabla con una fila por reclamación, y el
  total).
- **ARS-UASD** — "Formulario de Reclamación de Servicios Médicos".
- **ARS Yunen** — "Reclamación por Servicio de Salud".
- **ARS Reservas** — recibo/confirmación de su portal web
  (arsreservas.com) — confirma que al menos una ARS tiene plataforma propia
  donde ver/gestionar la reclamación en línea, relevante para una futura
  integración de "subida directa".
- **MAPFRE Salud ARS** — "Reclamación de Pago por Servicios Prestados".
- **ARS Primera** — comprobante de autorización de su portal (WebSalud).
- **ARS Universal** — "Formulario Reclamación Ambulatoria".
- **Humano** — "Reclamación por Servicios Médicos".

De ahí salió el catálogo de campos en `src/lib/claimFields.js`:

- **Núcleo (obligatorio, aparece en casi todas):** nombre del
  afiliado/paciente, no. de carnet/NSS, **no. de autorización**, fecha del
  servicio, tipo de servicio, monto autorizado/reclamado.
- **Resto de los campos son opcionales** porque no todas las ARS los piden
  igual: cédula, edad, sexo, titular/dependiente, código de afiliado, NAF,
  plan, dirección, ciudad, correo, empleador, diagnóstico, procedimiento
  (CUPS), valor total del servicio, copago/diferencia, "no procede" (cuando
  la ARS rechaza parte), fechas de ingreso/alta, días de internamiento,
  habitación, y los datos del médico.
- El monto casi nunca es un solo número: la mayoría de los formularios
  distinguen **valor total**, **monto autorizado/cubierto por la ARS**
  (el campo núcleo `monto`) y **copago/diferencia a cargo del afiliado**.

Cada ARS tiene su propio formulario de entrada, con sus propios campos y en
distinto orden — pero eso no afecta al formulario de digitación, porque el
digitador solo llena lo que ve en el papel, sin importar el orden en que
esté impreso. Lo que sí varía, muy raramente, es el formato de la relación
de salida — para eso está `/plantillas` (ver sección de Flujo arriba):
normalmente una sola plantilla genérica sirve para todas las ARS.

**Importante:** los documentos que se compartieron para este análisis tenían
datos reales de pacientes y médicos (nombres, cédulas, diagnósticos,
teléfonos, correos). Esa información nunca se copió a este repositorio ni a
la base de datos — solo se usó la estructura de campos.

**Excepción deliberada — catálogo de médicos:** a diferencia de los ejemplos
de reclamaciones (que eran solo para entender la estructura), las listas de
médicos que el usuario comparte sí se cargan tal cual a la tabla `doctors` /
`doctor_ars_codigos` — es su propio catálogo de negocio (nombre, cédula,
código por ARS), no un dato de paciente, y es literalmente el contenido que
esa parte de la app existe para guardar. Se va armando ARS por ARS a medida
que el usuario manda cada lista.

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

- [ ] Armar en `/plantillas` la plantilla genérica de relación con el
      formato real que ya usan (una sola vez, sin ARS asignada — el
      catálogo de campos ya cubre las 9 ARS revisadas). Solo hace falta una
      plantilla específica por ARS si alguna de verdad pide un formato de
      entrega distinto al estándar.
- [ ] La "hoja de presentación" — cuando el usuario comparta su formato
      real, sumar la exportación específica para ese tipo de plantilla
      (hoy `export_templates` ya soporta `tipo: hoja_presentacion`, pero
      solo queda guardada, sin botón de descarga propio todavía).
- [ ] Confirmar volumen de reclamaciones/día para decidir si la Fase 2/3 de
      IA algún día tiene sentido.
- [ ] Decidir permisos por rol (¿un supervisor debe aprobar antes de
      generar la relación?).
- [ ] Íconos PWA reales para instalar en pantalla de inicio (hoy hay un
      placeholder simple en `public/icons/icon.svg`).
- [ ] Despliegue en producción (Vercel es la opción más simple para
      Next.js, con capa gratuita).
