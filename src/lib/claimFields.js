// Campos de una reclamación médica, basados en formularios reales de 6 ARS
// distintas que se revisaron con el usuario (sin guardar sus datos de
// pacientes/médicos, solo la estructura de campos):
//
// - ARS Amor y Paz (red ASEMAP) — formulario individual en papel.
// - ARS Senasa — formulario individual ("Formulario de Reclamaciones
//   Médicas") y la relación ya consolidada por médico (Excel).
// - ARS-UASD — "Formulario de Reclamación de Servicios Médicos".
// - ARS Yunen — "Reclamación por Servicio de Salud".
// - ARS Reservas — recibo/confirmación de su portal web (arsreservas.com).
// - MAPFRE Salud ARS — "Reclamación de Pago por Servicios Prestados".
//
// El bloque "núcleo" es el que aparece en (casi) las 6. El resto es
// opcional porque no todas las ARS lo piden — se agrega según aparece en
// más formularios reales.
export const CLAIM_SECTIONS = [
  {
    title: "Núcleo (obligatorio en toda ARS)",
    fields: [
      { name: "afiliado_nombre", label: "Nombre del afiliado / paciente", type: "text", required: true },
      { name: "no_carnet_nss", label: "No. de carnet / NSS", type: "text", required: true },
      { name: "no_autorizacion", label: "No. de autorización", type: "text", required: true },
      { name: "fecha_servicio", label: "Fecha del servicio", type: "date", required: true },
      {
        name: "tipo_servicio",
        label: "Tipo de servicio",
        type: "select",
        options: [
          "Consulta",
          "Consulta a especialista",
          "Emergencia",
          "Laboratorio",
          "Rayos-X",
          "Farmacia",
          "Honorarios",
          "Cirugía",
          "Internamiento / Hospitalización",
          "Ambulatorio",
          "Servicios dentales",
          "Otros",
        ],
        required: true,
      },
      { name: "monto", label: "Monto autorizado / valor reclamado (RD$)", type: "number", required: true },
    ],
  },
  {
    title: "Afiliado / paciente",
    fields: [
      { name: "paciente_cedula", label: "Cédula", type: "text" },
      { name: "edad", label: "Edad", type: "text" },
      { name: "sexo", label: "Sexo", type: "select", options: ["F", "M"] },
      { name: "titular_o_dependiente", label: "Titular o dependiente", type: "select", options: ["Titular", "Dependiente"] },
      { name: "codigo_afiliado", label: "Código de afiliado", type: "text" },
      { name: "naf", label: "NAF", type: "text" },
      { name: "plan", label: "Plan", type: "text" },
      { name: "tipo_plan", label: "Tipo de plan (PDSS / Complementario / PMP / Otro)", type: "text" },
      { name: "direccion", label: "Dirección", type: "text" },
      { name: "ciudad", label: "Ciudad", type: "text" },
      { name: "telefono", label: "Teléfono", type: "text" },
      { name: "correo_electronico", label: "Correo electrónico", type: "text" },
      { name: "nombre_empleador", label: "Nombre del empleador", type: "text" },
      { name: "telefono_empleador", label: "Teléfono del empleador", type: "text" },
      { name: "autorizado_por", label: "Autorizado por", type: "text" },
    ],
  },
  {
    title: "Clínico",
    fields: [
      { name: "diagnostico", label: "Diagnóstico", type: "textarea" },
      { name: "procedimiento", label: "Procedimiento(s) realizado(s)", type: "textarea" },
      { name: "codigo_procedimiento", label: "Código del procedimiento (CUPS)", type: "text" },
      { name: "valor_total", label: "Valor total del servicio (RD$)", type: "number" },
      { name: "a_pagar_por_afiliado", label: "Copago / diferencia a cargo del afiliado (RD$)", type: "number" },
      { name: "no_procede", label: "No procede (si la ARS rechazó parte)", type: "text" },
      { name: "fecha_ingreso", label: "Fecha de ingreso", type: "date" },
      { name: "fecha_alta", label: "Fecha de alta", type: "date" },
      { name: "total_dias", label: "Total de días (internamiento)", type: "number" },
      { name: "no_habitacion", label: "No. de habitación", type: "text" },
    ],
  },
  {
    title: "Médico",
    fields: [
      { name: "doctor_nombre", label: "Nombre del médico", type: "text" },
      { name: "doctor_codigo", label: "Código / exequátur / código PSS ante la ARS", type: "text" },
      { name: "doctor_cedula", label: "Cédula del médico", type: "text" },
      { name: "especialidad", label: "Especialidad", type: "text" },
      { name: "centro_medico", label: "Centro médico", type: "text" },
      { name: "telefono_medico", label: "Teléfono del médico", type: "text" },
    ],
  },
  {
    title: "Observaciones",
    fields: [{ name: "observaciones", label: "Observaciones", type: "textarea" }],
  },
];

export const ALL_FIELD_NAMES = CLAIM_SECTIONS.flatMap((s) => s.fields.map((f) => f.name));

export const REQUIRED_FIELD_NAMES = CLAIM_SECTIONS.flatMap((s) =>
  s.fields.filter((f) => f.required).map((f) => f.name)
);

export const CLAIM_STATUS_LABELS = {
  pendiente: "Pendiente de digitar",
  en_proceso: "En proceso",
  revisado: "Revisado",
  en_relacion: "En relación",
  enviado: "Enviado",
  rechazado: "Rechazado",
};
