import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import GenerarRelacionButton from "@/components/GenerarRelacionButton";

export const dynamic = "force-dynamic";

export default async function RelacionesPage() {
  const supabase = await createClient();

  // La relación real (ver Senasa) se arma por médico dentro de cada ARS, no
  // por ARS completa — cada médico tiene su propio bloque de encabezado.
  const { data: pendingClaims } = await supabase
    .from("claims")
    .select(
      "id, monto, ars_id, doctor_nombre, doctor_codigo, ars_catalog(id, nombre)"
    )
    .eq("status", "revisado");

  const pendingGroups = new Map();
  for (const c of pendingClaims || []) {
    if (!c.ars_id) continue;
    const key = `${c.ars_id}::${c.doctor_nombre || ""}::${c.doctor_codigo || ""}`;
    if (!pendingGroups.has(key)) {
      pendingGroups.set(key, {
        arsId: c.ars_id,
        ars: c.ars_catalog,
        doctorNombre: c.doctor_nombre,
        doctorCodigo: c.doctor_codigo,
        count: 0,
        total: 0,
      });
    }
    const entry = pendingGroups.get(key);
    entry.count += 1;
    entry.total += Number(c.monto || 0);
  }

  const { data: relaciones } = await supabase
    .from("relaciones")
    .select("id, fecha, estado, total_monto, doctor_nombre, ars_catalog(nombre)")
    .order("created_at", { ascending: false });

  const { data: templates } = await supabase
    .from("export_templates")
    .select("id, nombre, ars_id")
    .eq("tipo", "relacion");

  // Para sugerir el próximo comprobante disponible por médico (el nombre en
  // claims es texto libre, así que se resuelve por coincidencia de nombre).
  const { data: doctorsForMatch } = await supabase.from("doctors").select("id, nombre");
  const { data: comprobantesDisponibles } = await supabase
    .from("comprobantes")
    .select("id, numero, doctor_id")
    .eq("estado", "disponible")
    .order("created_at", { ascending: true });

  function nextComprobanteFor(doctorNombre) {
    if (!doctorNombre) return null;
    const doctor = (doctorsForMatch || []).find(
      (d) => d.nombre.trim().toLowerCase() === doctorNombre.trim().toLowerCase()
    );
    if (!doctor) return null;
    return (comprobantesDisponibles || []).find((c) => c.doctor_id === doctor.id) || null;
  }

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-slate-900">Relaciones</h1>

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-semibold text-slate-700">
          Listas para generar
        </h2>
        <p className="mb-3 text-xs text-slate-400">
          Se agrupan por ARS + médico, igual que el formato de relación que ya
          usan (encabezado del médico + una fila por reclamación). Si una ARS
          no tiene{" "}
          <Link href="/plantillas" className="text-brand-600 hover:underline">
            plantilla
          </Link>{" "}
          propia, se exporta con un formato genérico.
        </p>
        {pendingGroups.size === 0 ? (
          <p className="text-sm text-slate-400">
            No hay reclamaciones revisadas pendientes de agrupar.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from(pendingGroups.entries()).map(([key, entry]) => (
              <div
                key={key}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4"
              >
                <div>
                  <p className="font-medium text-slate-900">{entry.ars?.nombre}</p>
                  <p className="text-sm text-slate-600">
                    {entry.doctorNombre || "(médico sin especificar)"}
                  </p>
                  <p className="text-sm text-slate-500">
                    {entry.count} reclamaciones · RD$ {entry.total.toFixed(2)}
                  </p>
                </div>
                <GenerarRelacionButton
                  arsId={entry.arsId}
                  doctorNombre={entry.doctorNombre}
                  doctorCodigo={entry.doctorCodigo}
                  templates={(templates || []).filter(
                    (t) => !t.ars_id || t.ars_id === entry.arsId
                  )}
                  comprobante={nextComprobanteFor(entry.doctorNombre)}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Historial</h2>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-2">ARS</th>
                <th className="px-4 py-2">Médico</th>
                <th className="px-4 py-2">Fecha</th>
                <th className="px-4 py-2">Estado</th>
                <th className="px-4 py-2">Total</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {(relaciones || []).map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">{r.ars_catalog?.nombre}</td>
                  <td className="px-4 py-2">{r.doctor_nombre || "—"}</td>
                  <td className="px-4 py-2 text-slate-500">{r.fecha}</td>
                  <td className="px-4 py-2">{r.estado}</td>
                  <td className="px-4 py-2">RD$ {Number(r.total_monto).toFixed(2)}</td>
                  <td className="px-4 py-2">
                    <a
                      href={`/api/relaciones/${r.id}/export`}
                      className="text-brand-600 hover:underline"
                    >
                      Descargar Excel
                    </a>
                  </td>
                </tr>
              ))}
              {(!relaciones || relaciones.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    Aún no se ha generado ninguna relación.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
