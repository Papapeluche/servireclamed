import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CLAIM_STATUS_LABELS } from "@/lib/claimFields";
import EscanearQR from "@/components/EscanearQR";
import AutoRefresh from "@/components/AutoRefresh";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

export default async function DashboardPage({ searchParams }) {
  const params = await searchParams;
  const supabase = await createClient();

  const activeStatus = params?.estado || "";
  const page = Math.max(1, Number(params?.pagina) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // Los contadores tienen que salir de un conteo real (count: 'exact'), no
  // de la página que se está mostrando — si no, con más de 100
  // reclamaciones en total, los números mienten.
  const countEntries = await Promise.all(
    Object.keys(CLAIM_STATUS_LABELS).map(async (status) => {
      const { count } = await supabase
        .from("claims")
        .select("id", { count: "exact", head: true })
        .eq("status", status);
      return [status, count || 0];
    })
  );
  const counts = Object.fromEntries(countEntries);

  let query = supabase
    .from("claims")
    .select("id, status, afiliado_nombre, ars_id, monto, created_at, ars_catalog(nombre)", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (activeStatus) query = query.eq("status", activeStatus);

  const { data: claims, error, count: totalFiltered } = await query;

  const totalPages = Math.max(1, Math.ceil((totalFiltered || 0) / PAGE_SIZE));

  function pageHref(p, estado = activeStatus) {
    const qs = new URLSearchParams();
    if (estado) qs.set("estado", estado);
    if (p > 1) qs.set("pagina", String(p));
    const s = qs.toString();
    return s ? `/dashboard?${s}` : "/dashboard";
  }

  return (
    <div>
      <AutoRefresh seconds={15} />

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Reclamaciones</h1>
        <Link
          href="/capturar"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          + Capturar nueva
        </Link>
      </div>

      <div className="mb-6">
        <EscanearQR />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
        {Object.entries(CLAIM_STATUS_LABELS).map(([status, label]) => (
          <Link
            key={status}
            href={pageHref(1, activeStatus === status ? "" : status)}
            className={`rounded-xl border p-3 text-center transition ${
              activeStatus === status
                ? "border-brand-600 bg-brand-50"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <div className="text-2xl font-semibold text-slate-900">
              {counts[status] || 0}
            </div>
            <div className="text-xs text-slate-500">{label}</div>
          </Link>
        ))}
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          Error cargando reclamaciones: {error.message}
        </p>
      )}

      {activeStatus && (
        <p className="mb-3 text-sm text-slate-500">
          Filtrando por: <strong>{CLAIM_STATUS_LABELS[activeStatus]}</strong> ·{" "}
          <Link href="/dashboard" className="text-brand-600 hover:underline">
            ver todas
          </Link>
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

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
          <span>
            Página {page} de {totalPages} · {totalFiltered} reclamaciones
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={pageHref(page - 1)}
                className="rounded-lg border border-slate-300 px-3 py-1 hover:bg-slate-50"
              >
                Anterior
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={pageHref(page + 1)}
                className="rounded-lg border border-slate-300 px-3 py-1 hover:bg-slate-50"
              >
                Siguiente
              </Link>
            )}
          </div>
        </div>
      )}
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
