import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CLAIM_STATUS_LABELS } from "@/lib/claimFields";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: claims, error } = await supabase
    .from("claims")
    .select("id, status, afiliado_nombre, ars_id, monto, created_at, ars_catalog(nombre)")
    .order("created_at", { ascending: false })
    .limit(100);

  const counts = {};
  for (const status of Object.keys(CLAIM_STATUS_LABELS)) counts[status] = 0;
  for (const c of claims || []) counts[c.status] = (counts[c.status] || 0) + 1;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Reclamaciones</h1>
        <Link
          href="/capturar"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          + Capturar nueva
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
        {Object.entries(CLAIM_STATUS_LABELS).map(([status, label]) => (
          <div
            key={status}
            className="rounded-xl border border-slate-200 bg-white p-3 text-center"
          >
            <div className="text-2xl font-semibold text-slate-900">
              {counts[status] || 0}
            </div>
            <div className="text-xs text-slate-500">{label}</div>
          </div>
        ))}
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          Error cargando reclamaciones: {error.message}
        </p>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2">Paciente</th>
              <th className="px-4 py-2">ARS</th>
              <th className="px-4 py-2">Monto</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {(claims || []).map((c) => (
              <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-2">
                  <Link href={`/reclamaciones/${c.id}`} className="text-brand-600 hover:underline">
                    {c.afiliado_nombre || "(sin nombre aún)"}
                  </Link>
                </td>
                <td className="px-4 py-2">{c.ars_catalog?.nombre || "—"}</td>
                <td className="px-4 py-2">
                  {c.monto ? `RD$ ${c.monto}` : "—"}
                </td>
                <td className="px-4 py-2">
                  <StatusBadge status={c.status} />
                </td>
                <td className="px-4 py-2 text-slate-500">
                  {new Date(c.created_at).toLocaleDateString("es-DO")}
                </td>
              </tr>
            ))}
            {(!claims || claims.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  Aún no hay reclamaciones capturadas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    pendiente: "bg-warn-100 text-warn-700",
    en_proceso: "bg-blue-100 text-blue-700",
    revisado: "bg-emerald-100 text-emerald-700",
    en_relacion: "bg-indigo-100 text-indigo-700",
    enviado: "bg-slate-200 text-slate-700",
    rechazado: "bg-red-100 text-red-700",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] || ""}`}>
      {CLAIM_STATUS_LABELS[status] || status}
    </span>
  );
}
