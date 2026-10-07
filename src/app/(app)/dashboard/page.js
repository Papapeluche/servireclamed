import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CLAIM_STATUS_LABELS } from "@/lib/claimFields";
import EscanearQR from "@/components/EscanearQR";
import AutoRefresh from "@/components/AutoRefresh";
import DashboardSearch from "@/components/DashboardSearch";
import { getProfilesMap } from "@/lib/auth";
import ReclamacionesTabla from "@/components/ReclamacionesTabla";
import ReintentarIABoton from "@/components/ReintentarIABoton";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

export default async function DashboardPage({ searchParams }) {
  const params = await searchParams;
  const supabase = await createClient();

  const activeStatus = params?.estado || "";
  const page = Math.max(1, Number(params?.pagina) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // Se quitan comas y comodines de LIKE porque .or() de PostgREST los usa
  // como separadores/wildcards — si no, una búsqueda con esos caracteres
  // rompe el filtro en vez de simplemente no encontrar nada.
  const q = (params?.q || "").trim().replace(/[,()%*]/g, "");
  const SEARCH_COLUMNS = [
    "afiliado_nombre",
    "paciente_cedula",
    "doctor_nombre",
    "doctor_cedula",
    "doctor_codigo",
    "no_carnet_nss",
  ];

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
    .select(
      "id, status, afiliado_nombre, ars_id, monto, created_at, captured_by, digitized_by, ars_catalog(nombre)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (activeStatus) query = query.eq("status", activeStatus);
  if (q) query = query.or(SEARCH_COLUMNS.map((col) => `${col}.ilike.%${q}%`).join(","));

  // Las que la IA no pudo leer y nadie ha tocado — para reintentarlas en
  // bloque. Independiente de la página/filtro que se esté viendo.
  const sinLeerQuery = supabase
    .from("claims")
    .select("id")
    .eq("status", "pendiente")
    .not("ai_error", "is", null)
    .order("created_at", { ascending: true })
    .limit(1000);

  const [{ data: claims, error, count: totalFiltered }, profilesMap, { data: sinLeer }] = await Promise.all([
    query,
    getProfilesMap(supabase),
    sinLeerQuery,
  ]);

  const totalPages = Math.max(1, Math.ceil((totalFiltered || 0) / PAGE_SIZE));

  function pageHref(p, estado = activeStatus) {
    const qs = new URLSearchParams();
    if (estado) qs.set("estado", estado);
    if (q) qs.set("q", q);
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

      <ReintentarIABoton ids={(sinLeer || []).map((c) => c.id)} />

      <div className="mb-6">
        <DashboardSearch />
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

      {(activeStatus || q) && (
        <p className="mb-3 text-sm text-slate-500">
          Filtrando por:{" "}
          {activeStatus && <strong>{CLAIM_STATUS_LABELS[activeStatus]}</strong>}
          {activeStatus && q && " · "}
          {q && (
            <>
              búsqueda &quot;<strong>{q}</strong>&quot;
            </>
          )}{" "}
          ·{" "}
          <Link href="/dashboard" className="text-brand-600 hover:underline">
            ver todas
          </Link>
        </p>
      )}

      <ReclamacionesTabla
        filas={(claims || []).map((c) => ({
          id: c.id,
          status: c.status,
          afiliado_nombre: c.afiliado_nombre,
          ars: c.ars_catalog?.nombre || null,
          monto: c.monto,
          por: profilesMap[c.digitized_by] || profilesMap[c.captured_by] || null,
          // Se formatea aquí, en hora de RD: si se formateara en el navegador,
          // el servidor (UTC) y el navegador podrían mostrar días distintos.
          fecha: new Date(c.created_at).toLocaleDateString("es-DO", { timeZone: "America/Santo_Domingo" }),
        }))}
      />

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
