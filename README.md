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
3. `/relaciones` — **se organiza sola, sin que nadie tenga que "crear" nada
   a mano.** A medida que se digita, cada reclamación revisada se agrupa
   automáticamente por **ARS + médico** en tarjetas vivas (igual que el
   formato real de Senasa: un médico, un bloque de encabezado, una fila por
   reclamación). Cada tarjeta muestra cuántas van pendientes, en proceso y
   revisadas — así se ve el avance de un lote completo (aunque sean 600
   reclamaciones de golpe) desde el primer escaneo, no solo al final.
   En cuanto una tarjeta tiene al menos una reclamación revisada, aparecen
   dos botones: **"Convertir en plantilla"** (el Excel de la relación, con
   los datos reales de los pacientes) y **"Convertir en hoja de
   presentación"** (la factura). El primer clic en cualquiera de los dos
   crea la relación por dentro (mueve esas reclamaciones a `en_relacion`);
   si después haces clic en el otro botón, reutiliza esa misma relación en
   vez de crear una segunda. Ninguno de los dos exporta a ciegas: cada uno
   abre un panel con los campos/columnas del formato ya marcados, más un
   selector para **agregar cualquier otro dato que ya se digitó** de esas
   reclamaciones (diagnóstico, edad, empleador, lo que haga falta) — solo
   para esa descarga, sin tocar el formato guardado. Nada de lo digitado se
   pierde por no estar en el formato: sigue en la reclamación, solo hay que
   agregarlo aquí si un caso puntual lo necesita.
4. `/plantillas` (menú "Formatos") — ya vienen **dos formatos genéricos
   listos de fábrica** ("Relación estándar" y "Hoja de presentación
   estándar"), así que en el día a día nunca hace falta entrar aquí: los
   botones de `/relaciones` los usan solos. Esta pantalla es solo para
   cuando una ARS en particular pide un formato de entrega distinto al
   estándar — ahí se ajustan los campos del encabezado y las columnas o
   categorías, y se le asigna esa ARS específica.

5. `/medicos` — catálogo de médicos con su **código por ARS** (el código de
   un médico no es el mismo en todas las ARS — se confirmó al cargar la
   primera lista real, de CMD). Al digitar una reclamación, si el médico ya
   está en el catálogo, sus datos (código para esa ARS, cédula,
   especialidad, centro) se auto-completan en vez de tener que escribirlos
   a mano cada vez — menos digitación, menos error. Desde `/medicos/nuevo`
   y `/medicos/[id]` se pueden crear y editar médicos (y sus códigos por
   ARS) directamente desde la app.

6. **Hoja de presentación** — a diferencia de la relación (que es igual
   para todas las ARS), esta sí varía por ARS: es la factura fiscal que se
   arma *después* de tener la relación lista, agrupando las reclamaciones
   en categorías de facturación (ej. Consultas, Procedimientos
   ambulatorios, Honorarios/Emergencias) en vez de una fila por
   reclamación. Se genera con el botón "Convertir en hoja de presentación"
   (desde la tarjeta viva en `/relaciones`, o desde el Historial para una
   relación ya generada antes), usando una plantilla `tipo:
   hoja_presentacion` — ahí se definen las categorías y qué tipos de
   servicio caen en cada una. La plantilla es el punto de partida, no una
   camisa de fuerza: al generar, el botón abre un panel con casillas para
   cada campo del encabezado y cada categoría, así que si esta vez no hace
   falta algún dato (ej. no aplica "Fecha de Vencimiento", o no hubo
   hospitalización) se desmarca y no sale en el Excel — sin tener que crear
   una plantilla nueva solo por eso. Ya existe una plantilla real para
   **ARS CMD** (`Hoja de presentación CMD`), calcada de una factura real que
   compartió el usuario.

7. `/comprobantes` — cada médico tiene un rango limitado de **NCF**
   (Número de Comprobante Fiscal, el número de factura exigido por la
   DGII). Se le asigna un rango (prefijo + número inicial + cantidad +
   fecha de vencimiento) una sola vez; al generar la hoja de presentación
   de una relación se puede vincular el próximo NCF disponible de ese
   médico — queda registrado a qué ARS se usó, por qué monto, y con link a
   la relación, para poder consultarlo después. El NCF se consume al
   generar la **hoja de presentación**, no al generar la relación (la
   relación es solo un listado de trabajo, la hoja de presentación es la
   factura real).

8. `/medicos/[id]` — **mesa de trabajo del médico**. Rediseñada después de
   una revisión con tres enfoques (arquitectura de información, diseño
   visual, y contexto de negocio) sobre la primera versión, que amontonaba
   los códigos por ARS en la lista y mezclaba edición ocasional con datos de
   consulta frecuente. Ahora:
   - Una fila de **resumen** (ARS con código, relaciones totales, monto
     histórico, NCF por vencer) para tener el estado del médico de un
     vistazo, sin tener que leer tabla por tabla.
   - **ARS y códigos** — sección siempre visible (ya no escondida dentro del
     panel de edición) con el código de ese médico en cada ARS, en un
     listado de dos columnas legible incluso con 9+ ARS, y su propio
     agregar/quitar independiente del formulario de datos generales.
   - El panel de **editar datos del médico** (nombre, cédula, RNC, teléfono,
     especialidad, centro) queda plegado por separado, porque se edita rara
     vez — ya no comparte espacio con los códigos por ARS, que sí se
     consultan seguido.
   - **Facturación por ARS**: chips por ARS (solo las que tienen algo) con
     el historial de relaciones de ese médico — fecha, total, y si ya se
     generó la hoja de presentación o sigue solo como relación.
   - **Alerta de comprobantes por vencer**: si el médico tiene NCF
     `disponible` con vencimiento dentro de 30 días (o ya vencido) aparece
     un aviso arriba de todo — es dinero/tiempo perdido si un NCF vence sin
     usarse, y antes no había forma de verlo sin revisar comprobante por
     comprobante.
   - **Comprobantes (NCF) usados**: al hacer clic se despliega en qué
     relación se usó cada uno y cuándo, con enlace a "ver todos los datos
     relacionados" (la ficha completa en `/relaciones/[id]`).
   En la lista `/medicos`, la columna de códigos por ARS (antes una fila de
   chips que podía tener 9+ elementos por médico, la queja original de
   Angel) se reemplazó por un badge compacto ("6 ARS" / "Sin código") con
   tooltip — el detalle completo vive en la ficha del médico, no en la
   lista.
   Esto requirió agregar `doctor_id` real (FK) tanto a `claims` como a
   `relaciones` — antes solo se emparejaban por nombre/cédula, que puede
   variar entre reclamaciones; ahora se resuelve una sola vez al digitar
   (`ClaimEditor`) y se propaga a la relación al crearla. También se agregó
   `relaciones.hoja_generada_at`, que se marca al generar la hoja de
   presentación (con o sin NCF), para poder distinguir "relación armada" de
   "ya facturada" en el historial.
   - `/relaciones/[id]` — ficha de una relación puntual: datos del médico,
     el NCF usado (si lo hay), las reclamaciones incluidas, y los mismos
     botones de descarga que en `/relaciones` — pensada para llegar aquí
     desde el historial general o desde la mesa de trabajo del médico.

Un mismo formulario en papel a veces trae **más de un procedimiento** (visto
en Humano y ARS-UASD) — desde `/reclamaciones/[id]` hay un botón "+ Otra
línea de esta misma imagen" que crea una segunda reclamación reutilizando la
misma foto, en vez de forzar a tomarla de nuevo.

## Capturar desde el celular mientras se digita en la PC

No hace falta "vincular" el celular a la PC — cada dispositivo inicia
sesión por su cuenta y ambos comparten la misma cola de trabajo a través de
la base de datos: el celular sube la foto y crea la reclamación en
`pendiente`, y esa reclamación aparece en `/dashboard` para digitarla desde
la PC con teclado y pantalla grande.

Para que sea más cómodo entrar a `/capturar` desde el celular sin teclear
la URL, `/dashboard` muestra un **código QR** (`src/components/EscanearQR.jsx`)
que apunta directo a esa pantalla. El dashboard también se auto-refresca
cada 15 segundos (`src/components/AutoRefresh.jsx`) para que lo capturado
desde el celular aparezca sin tener que recargar la página a mano.

## Volumen — lotes de 2 hasta 600+ reclamaciones por médico/ARS

Todas las consultas que arman una relación o su exportación filtran por
ARS/médico/relación específicos (nunca traen "todo"), así que un lote de
cientos de reclamaciones no choca con ningún límite — ni en la base de
datos ni al generar el Excel. El único límite real que había era en
`/dashboard`: traía nada más las últimas 100 reclamaciones **en total** sin
importar el estado, y los contadores de arriba se calculaban sobre esas
mismas 100 — con más de 100 reclamaciones acumuladas, las más viejas
desaparecían de la vista sin aviso y los contadores mentían. Se corrigió:
los contadores ahora salen de un conteo exacto por estado, y la tabla
pagina de 100 en 100 con filtro por estado (clic en cualquier contador).

Con ese mismo volumen en mente, `/dashboard` también tiene un **buscador**
(nombre del paciente, cédula, médico o código) que filtra en el servidor
(`ILIKE` sobre esos campos, combinado con el filtro de estado, sin perder la
paginación) — necesario ahí porque la tabla nunca trae todo. `/medicos` y
`/comprobantes` también tienen buscador, pero client-side (filtran el
arreglo que ya se trajo completo), porque esas listas no están paginadas.
Igual el Historial de `/relaciones`. No se le puso buscador a `/plantillas`
(son pocos formatos, fijos) ni a las reclamaciones de un médico en su mesa de
trabajo (ya se filtran por ARS con los chips).

`/medicos` también tiene chips de **centro médico** (arriba del buscador):
al hacer clic en uno, filtra la tabla a solo los médicos de ese centro. Como
`centro_medico` es texto libre (cada digitador lo escribe a mano), los chips
agrupan por versión normalizada (sin mayúsculas ni espacios de más) para que
"Clínica Abreu" y "clinica abreu " no salgan como dos centros distintos, y
hay un chip "Sin centro médico" para ubicar rápido a quién le falta ese dato.
Es una solución de mientras tanto con el dato que ya existe — el usuario
comentó que esto mejorará más adelante si se crea un catálogo propio de
centros médicos (con su propia info, no solo el nombre suelto en `doctors`).



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

### Catálogo de médicos — import inicial (21 archivos "Códigos PSS")

Se cargaron 50 médicos/PSS con 554 códigos en 18 ARS a partir de un correo
con 21 archivos (uno por ARS). Nombres de ARS validados contra fuentes
oficiales antes de guardarlos (algunos venían mal escritos o con nombres
comerciales, ej. "Wordway" → **Worldwide Seguros**; "Asemap" es en
realidad la razón social de **ARS ASEMAP**, la misma entidad que el
formulario de "Ars Amor y Paz"; "Simag" se renombró a **ARS Abel González**
en 2023). Se agregó también **IDOPPRIL** (no es una ARS bajo la 87-01, es
el instituto que cubre accidentes laborales, pero igual se le entregan
reclamaciones y tiene código de médicos).

Se cruzó cédula por cédula entre los 21 archivos para no duplicar personas
por variaciones de escritura del nombre (23 casos, ej. "Delia A. Kiem" vs
"Delia Alfonsina Kiem" — se quedó con el nombre más completo). Dos
inconsistencias reales se resolvieron con evidencia cruzada en vez de
adivinar:
- El archivo de UASD traía a "Patria Gonzalez" con la cédula de otra
  médica ("Ordalina Gonzalez Espinal") por error de digitación — se
  excluyó esa fila en vez de fusionar a dos personas distintas. Su cédula
  correcta (079-0009980-0) ya estaba confirmada por su propio encabezado
  en el archivo de relación de Senasa.
- "July Leonor Paredes Rodriguez" aparecía con dos cédulas que difieren en
  la transposición de dos dígitos; se usó la que respaldan 10 de los 15
  archivos que la mencionan (incluyendo Senasa, UASD y Humano).

Tres archivos (IDOPPRIL, Futuro, Worldwide Seguros) no traían código
todavía — solo nombre/cédula. Un archivo (GMA) trae además el centro donde
practica cada médico, ya guardado en `doctors.centro_medico`.

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
3. Para subirle el rol a `admin` o `supervisor`, un admin ya existente lo
   hace desde `/usuarios` en la app (ver siguiente sección) — ya no hace
   falta tocar la base de datos a mano para esto.

## Gobernanza de usuarios — roles y atribución

Auditoría hecha antes de esta feature: **cualquier usuario autenticado
podía hacer cualquier cosa**. La columna `profiles.role` existía (con
`digitador` por defecto) pero nada la usaba — ni RLS en la base de datos ni
la app — así que un digitador podía borrar médicos, anular comprobantes,
editar formatos, o incluso actualizar su propia fila en `profiles` para
ponerse `role = 'admin'` (falla real de seguridad, ya cerrada). Con esto en
mente se construyó gobernanza real:

**Tres roles:**
- **admin** — todo, incluyendo gestionar usuarios/roles, borrar médicos,
  crear/editar/borrar formatos (`export_templates`, `ars_catalog`).
- **supervisor** — puede asignar rangos de NCF nuevos y anular comprobantes,
  pero no borra médicos ni toca formatos.
- **digitador** — el trabajo diario: capturar, digitar, generar relaciones y
  hojas de presentación. No puede hacer cambios estructurales ni de otros
  usuarios.

**Dónde vive el control (capas, no solo la UI):**
- **RLS en Postgres** — la autoridad real. `doctors` separa DELETE (solo
  admin) del resto; `export_templates` y `ars_catalog` solo dejan
  crear/editar/borrar a admin (lectura sigue abierta a todos); `comprobantes`
  deja el UPDATE abierto (así el flujo normal de "marcar NCF como usado" al
  generar una hoja de presentación sigue funcionando para cualquiera) pero
  el INSERT (asignar un rango) requiere admin/supervisor.
- **Triggers** para las transiciones que RLS no puede distinguir por sí
  sola: anular un comprobante específicamente (no cualquier UPDATE) requiere
  admin/supervisor; cambiar la columna `role` de cualquier fila de
  `profiles` (la propia o la de otro) requiere ya ser admin — así se cerró
  el hueco de auto-escalación.
- **UI** — los botones/enlaces que la base de datos igual bloquearía se
  ocultan para quien no tiene el rol (menos confuso que dejarlos y que
  fallen). Las rutas API que hacen UPDATE/DELETE ahora piden la fila de
  vuelta (`.select()`) para poder avisar "no tienes permiso" en vez de
  fingir que sí se guardó cuando RLS calladamente no afectó ninguna fila
  (bug real que existía en `/api/doctors/[id]` DELETE y `/api/templates/[id]`).

**`/usuarios`** (solo admin) — lista de todos los usuarios con su rol, y un
selector para cambiarlo ahí mismo. Todavía no hay forma de invitar/crear
cuentas desde la app (sigue siendo por el dashboard de Supabase), pero
subir/bajar el rol de alguien ya no requiere tocar la base de datos.

**Atribución — "quién hizo qué":** antes `captured_by` no existía y
`digitized_by` se pisaba (el que tomaba la foto y el que la transcribía
podían ser personas distintas, y solo quedaba registrado el último). Se
separaron en columnas propias en `claims`. Ahora se ve en la práctica:
- Reclamación (`/reclamaciones/[id]`): capturada por / digitada por /
  revisada por.
- Dashboard: columna "Por" con quién la digitó (o la capturó, si aún nadie
  la ha digitado).
- Relación (`/relaciones/[id]`): "Creada por" junto a la fecha y el total.
- Comprobantes (`/comprobantes`): columna "Asignado por".

## Pendientes / decisiones abiertas

- [ ] Catálogo propio de **centros médicos** (tabla `centros_medicos`, con
      su propia dirección/teléfono, y `doctors.centro_medico_id` como FK en
      vez del texto libre actual). Hoy `/medicos` agrupa por el texto tal
      cual está escrito (normalizado a mayúsculas/espacios), que es una
      solución de mientras tanto — funciona pero no corrige de raíz que dos
      digitadores puedan escribir el mismo centro de formas distintas que la
      normalización no detecte (ej. abreviado vs. completo).
- [ ] Armar en `/plantillas` la plantilla genérica de relación con el
      formato real que ya usan (una sola vez, sin ARS asignada — el
      catálogo de campos ya cubre las 9 ARS revisadas). Solo hace falta una
      plantilla específica por ARS si alguna de verdad pide un formato de
      entrega distinto al estándar.
- [ ] Crear en `/plantillas` la hoja de presentación de las demás ARS con
      las que trabajan (solo existe la de CMD por ahora, calcada de una
      factura real).
- [ ] Confirmar si el RNC que aparece en una hoja de presentación es
      siempre de la ARS o a veces del médico/consultorio — según el
      usuario, algunos médicos facturan con su propio RNC de negocio en
      vez de cédula. El modelo ya soporta ambos (`ars_catalog.rnc` y
      `doctors.rnc`), solo falta confirmar caso por caso cuál usar en cada
      plantilla.
- [ ] Confirmar volumen de reclamaciones/día para decidir si la Fase 2/3 de
      IA algún día tiene sentido.
- [ ] Decidir permisos por rol (¿un supervisor debe aprobar antes de
      generar la relación?).
- [ ] Íconos PWA reales para instalar en pantalla de inicio (hoy hay un
      placeholder simple en `public/icons/icon.svg`).
- [ ] Despliegue en producción (Vercel es la opción más simple para
      Next.js, con capa gratuita).
