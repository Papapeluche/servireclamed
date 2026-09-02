import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AuditLogTable from "@/components/AuditLogTable";
import { AUDIT_CATEGORIES, actionsForCategory } from "@/lib/auditActions";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 200;

export default async function ConfiguracionActividadPage({ searchParams }) {
  const params = await searchParams;
  const categoria = params?.categoria || "";
  const supabase = await createClient();

  let query = supabase
    .from("audit_log")
    .select("id, created_at, actor_name, action, target_type, target_id, details")
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);

  const actions = actionsForCategory(categoria);
  if (actions) query = query.in("action", actions);

  const { data: eventos } = await query;

  function categoriaHref(key) {
    return key ? `/configuracion/actividad?categoria=${key}` : "/configuracion/actividad";
  }

  return (
    <div>
      <p className="mb-4 text-sm text-slate-500">
        Registro de acciones importantes: reclamaciones revisadas (con su
        médico y ARS), quién borró un médico, quién asignó o anuló
        comprobantes, quién creó o editó formatos, quién generó una hoja de
        presentación, y cambios a cuentas de usuario. Esta lista no se puede
        editar ni borrar desde la app, ni siquiera por un admin — solo se
        puede consultar.
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        <Link
          href={categoriaHref("")}
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            !categoria ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Todas
        </Link>
        {Object.entries(AUDIT_CATEGORIES).map(([key, cat]) => (
          <Link
            key={key}
            href={categoriaHref(key)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              categoria === key ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {cat.label}
          </Link>
        ))}
      </div>

      <AuditLogTable eventos={eventos || []} />

      {(eventos?.length || 0) >= PAGE_SIZE && (
        <p className="mt-3 text-xs text-slate-400">
          Mostrando los últimos {PAGE_SIZE} eventos
          {categoria ? ` de "${AUDIT_CATEGORIES[categoria]?.label}"` : ""}.
        </p>
      )}
    </div>
  );
}
