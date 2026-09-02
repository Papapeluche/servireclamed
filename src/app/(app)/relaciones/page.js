import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import RelacionGroupCard from "@/components/RelacionGroupCard";
import GenerarHojaPresentacionButton from "@/components/GenerarHojaPresentacionButton";
import DescargarPlantillaButton from "@/components/DescargarPlantillaButton";

export const dynamic = "force-dynamic";

export default async function RelacionesPage() {
  const supabase = await createClient();

  // Todo lo que aún no se ha convertido en relación se organiza solo, por
  // ARS + médico, a medida que se va digitando — sin tener que "crear" nada
  // a mano primero. Se muestran también pendiente/en_proceso para que se
  // vea el avance del lote completo, aunque solo lo revisado se puede
  // convertir todavía.
  const { data: activeClaims } = await supabase
    .from("claims")
    .select(
      "id, status, monto, ars_id, doctor_nombre, doctor_codigo, ars_catalog(id, nombre)"
    )
    .in("status", ["pendiente", "en_proceso", "revisado"]);

  const groups = new Map();
  for (const c of activeClaims || []) {
    if (!c.ars_id) continue;
    const key = `${c.ars_id}::${c.doctor_nombre || ""}::${c.doctor_codigo || ""}`;
    if (!groups.has(key)) {
      groups.set(key, {
        arsId: c.ars_id,
        ars: c.ars_catalog,
        doctorNombre: c.doctor_nombre,
        doctorCodigo: c.doctor_codigo,
        pendiente: 0,
        en_proceso: 0,
        revisado: 0,
        totalRevisado: 0,
      });
    }
    const entry = groups.get(key);
    entry[c.status] += 1;
    if (c.status === "revisado") entry.totalRevisado += Number(c.monto || 0);
  }

  const { data: relacionTemplates } = await supabase
    .from("export_templates")
    .select("id, nombre, ars_id, header_fields, table_columns")
    .eq("tipo", "relacion");

  const { data: hojaTemplates } = await supabase
    .from("export_templates")
    .select("id, nombre, ars_id, header_fields, categorias")
    .eq("tipo", "hoja_presentacion");

  // Para sugerir el próximo comprobante (NCF) disponible por médico.
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

  const { data: relaciones } = await supabase
    .from("relaciones")
    .select("id, fecha, estado, total_monto, doctor_nombre, ars_id, ars_catalog(nombre)")
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="mb-1 text-lg font-semibold text-slate-900">Relaciones</h1>
      <p className="mb-6 text-sm text-slate-500">
        Se organizan solas por ARS + médico a medida que digitas — no hace
        falta crear nada a mano. En cuanto un grupo tiene reclamaciones
        revisadas, aparecen los dos botones para convertirlo en el documento
        que necesites.
      </p>

      {groups.size === 0 ? (
        <p className="mb-8 text-sm text-slate-400">
          Todavía no hay reclamaciones capturadas.
        </p>
      ) : (
        <div className="mb-8 grid gap-3 sm:grid-cols-2">
          {Array.from(groups.entries()).map(([key, entry]) => (
            <RelacionGroupCard
              key={key}
              entry={entry}
              relacionTemplates={(relacionTemplates || []).filter(
                (t) => !t.ars_id || t.ars_id === entry.arsId
              )}
              hojaTemplates={(hojaTemplates || []).filter(
                (t) => !t.ars_id || t.ars_id === entry.arsId
              )}
              comprobante={nextComprobanteFor(entry.doctorNombre)}
            />
          ))}
        </div>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Historial</h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-2">ARS</th>
                <th className="px-4 py-2">Médico</th>
                <th className="px-4 py-2">Fecha</th>
                <th className="px-4 py-2">Total</th>
                <th className="px-4 py-2"></th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {(relaciones || []).map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">
                    <Link href={`/relaciones/${r.id}`} className="text-brand-600 hover:underline">
                      {r.ars_catalog?.nombre}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{r.doctor_nombre || "—"}</td>
                  <td className="px-4 py-2 text-slate-500">{r.fecha}</td>
                  <td className="px-4 py-2">RD$ {Number(r.total_monto).toFixed(2)}</td>
                  <td className="px-4 py-2">
                    <DescargarPlantillaButton
                      relacionId={r.id}
                      templates={(relacionTemplates || []).filter(
                        (t) => !t.ars_id || t.ars_id === r.ars_id
                      )}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <GenerarHojaPresentacionButton
                      relacionId={r.id}
                      templates={(hojaTemplates || []).filter(
                        (t) => !t.ars_id || t.ars_id === r.ars_id
                      )}
                      comprobante={nextComprobanteFor(r.doctor_nombre)}
                    />
                  </td>
                </tr>
              ))}
              {(!relaciones || relaciones.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    Aún no se ha convertido ninguna relación.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="mt-4 text-xs text-slate-400">
        ¿Formatos por ARS?{" "}
        <Link href="/plantillas" className="text-brand-600 hover:underline">
          Ajústalos aquí
        </Link>{" "}
        — ya vienen listos de fábrica (uno para relación y otro para hoja de
        presentación), esto es solo para cuando alguna ARS pida algo distinto.
      </p>
    </div>
  );
}
