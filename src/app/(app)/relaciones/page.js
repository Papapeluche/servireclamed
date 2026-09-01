import { createClient } from "@/lib/supabase/server";
import GenerarRelacionButton from "@/components/GenerarRelacionButton";

export const dynamic = "force-dynamic";

export default async function RelacionesPage() {
  const supabase = await createClient();

  const { data: pendingClaims } = await supabase
    .from("claims")
    .select("id, monto_reclamado, ars_id, ars_catalog(id, nombre)")
    .eq("status", "revisado");

  const pendingByArs = new Map();
  for (const c of pendingClaims || []) {
    if (!c.ars_id) continue;
    const key = c.ars_id;
    if (!pendingByArs.has(key)) {
      pendingByArs.set(key, { ars: c.ars_catalog, count: 0, total: 0 });
    }
    const entry = pendingByArs.get(key);
    entry.count += 1;
    entry.total += Number(c.monto_reclamado || 0);
  }

  const { data: relaciones } = await supabase
    .from("relaciones")
    .select("id, fecha, estado, total_monto, ars_catalog(nombre)")
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-slate-900">Relaciones</h1>

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-semibold text-slate-700">
          Listas para generar
        </h2>
        {pendingByArs.size === 0 ? (
          <p className="text-sm text-slate-400">
            No hay reclamaciones revisadas pendientes de agrupar por ARS.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from(pendingByArs.entries()).map(([arsId, entry]) => (
              <div
                key={arsId}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4"
              >
                <div>
                  <p className="font-medium text-slate-900">{entry.ars?.nombre}</p>
                  <p className="text-sm text-slate-500">
                    {entry.count} reclamaciones · RD$ {entry.total.toFixed(2)}
                  </p>
                </div>
                <GenerarRelacionButton arsId={arsId} />
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
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
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
