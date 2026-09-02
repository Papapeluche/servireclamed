const ACTION_LABELS = {
  RECLAMACION_REVISADA: "Reclamación revisada",
  DOCTOR_ELIMINADO: "Médico eliminado",
  PLANTILLA_CREADA: "Formato creado",
  PLANTILLA_EDITADA: "Formato editado",
  PLANTILLA_ELIMINADA: "Formato eliminado",
  COMPROBANTES_ASIGNADOS: "Comprobantes (NCF) asignados",
  COMPROBANTE_ANULADO: "Comprobante (NCF) anulado",
  HOJA_PRESENTACION_GENERADA: "Hoja de presentación generada",
  USUARIO_CREADO: "Usuario creado",
  USUARIO_ROL_CAMBIADO: "Rol de usuario cambiado",
  USUARIO_NOMBRE_EDITADO: "Nombre de usuario editado",
  USUARIO_CONTRASENA_RESETEADA: "Contraseña reseteada",
};

const ACTION_STYLES = {
  RECLAMACION_REVISADA: "bg-blue-100 text-blue-700",
  DOCTOR_ELIMINADO: "bg-red-100 text-red-700",
  PLANTILLA_CREADA: "bg-emerald-100 text-emerald-700",
  PLANTILLA_EDITADA: "bg-slate-100 text-slate-600",
  PLANTILLA_ELIMINADA: "bg-red-100 text-red-700",
  COMPROBANTES_ASIGNADOS: "bg-emerald-100 text-emerald-700",
  COMPROBANTE_ANULADO: "bg-red-100 text-red-700",
  HOJA_PRESENTACION_GENERADA: "bg-blue-100 text-blue-700",
  USUARIO_CREADO: "bg-emerald-100 text-emerald-700",
  USUARIO_ROL_CAMBIADO: "bg-brand-100 text-brand-700",
  USUARIO_NOMBRE_EDITADO: "bg-slate-100 text-slate-600",
  USUARIO_CONTRASENA_RESETEADA: "bg-slate-100 text-slate-600",
};

function describeDetails(action, details) {
  if (!details) return "—";
  switch (action) {
    case "RECLAMACION_REVISADA":
      return `${details.ars || "—"} · ${details.doctor || "(médico sin especificar)"}${
        details.capturada_por ? ` · capturada por ${details.capturada_por}` : ""
      }${details.monto ? ` · RD$ ${Number(details.monto).toFixed(2)}` : ""}`;
    case "DOCTOR_ELIMINADO":
    case "PLANTILLA_CREADA":
    case "PLANTILLA_ELIMINADA":
      return details.nombre || "—";
    case "PLANTILLA_EDITADA":
      return `${details.nombre || "—"} (${(details.cambios || []).join(", ")})`;
    case "COMPROBANTES_ASIGNADOS":
      return `${details.prefijo || ""}${details.numero_inicial} × ${details.cantidad}`;
    case "COMPROBANTE_ANULADO":
      return `NCF ${details.numero}`;
    case "HOJA_PRESENTACION_GENERADA":
      return `${details.ars || "—"} · ${details.doctor || "—"} · RD$ ${Number(details.total_monto || 0).toFixed(2)}${details.ncf ? ` · NCF ${details.ncf}` : ""}`;
    case "USUARIO_CREADO":
      return `${details.email} (${details.rol})`;
    case "USUARIO_ROL_CAMBIADO":
      return `${details.usuario || ""}: ${details.de} → ${details.a}`;
    case "USUARIO_NOMBRE_EDITADO":
      return `${details.de || "—"} → ${details.a}`;
    default:
      return JSON.stringify(details);
  }
}

export default function AuditLogTable({ eventos }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-slate-500">
          <tr>
            <th className="px-4 py-2">Fecha</th>
            <th className="px-4 py-2">Quién</th>
            <th className="px-4 py-2">Acción</th>
            <th className="px-4 py-2">Detalle</th>
          </tr>
        </thead>
        <tbody>
          {eventos.map((e) => (
            <tr key={e.id} className="border-t border-slate-100">
              <td className="whitespace-nowrap px-4 py-2 text-slate-500">
                {new Date(e.created_at).toLocaleString("es-DO")}
              </td>
              <td className="px-4 py-2 text-slate-800">{e.actor_name || "(sistema)"}</td>
              <td className="px-4 py-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_STYLES[e.action] || "bg-slate-100 text-slate-600"}`}
                >
                  {ACTION_LABELS[e.action] || e.action}
                </span>
              </td>
              <td className="px-4 py-2 text-slate-600">{describeDetails(e.action, e.details)}</td>
            </tr>
          ))}
          {eventos.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                Todavía no hay actividad registrada.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
