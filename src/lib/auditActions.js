// Categorías del historial de actividad — para poder filtrar en
// /configuracion/actividad sin que el volumen de reclamaciones (pueden ser
// cientos por día) entierre los eventos administrativos.
export const AUDIT_CATEGORIES = {
  reclamaciones: {
    label: "Reclamaciones",
    actions: ["RECLAMACION_REVISADA"],
  },
  facturacion: {
    label: "Facturación",
    actions: ["COMPROBANTES_ASIGNADOS", "COMPROBANTE_ANULADO", "HOJA_PRESENTACION_GENERADA"],
  },
  catalogo: {
    label: "Catálogo",
    actions: ["DOCTOR_ELIMINADO", "PLANTILLA_CREADA", "PLANTILLA_EDITADA", "PLANTILLA_ELIMINADA"],
  },
  usuarios: {
    label: "Usuarios",
    actions: [
      "USUARIO_CREADO",
      "USUARIO_ROL_CAMBIADO",
      "USUARIO_NOMBRE_EDITADO",
      "USUARIO_CONTRASENA_RESETEADA",
    ],
  },
};

export function actionsForCategory(categoria) {
  return AUDIT_CATEGORIES[categoria]?.actions || null;
}
