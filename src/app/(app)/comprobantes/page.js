import { createClient } from "@/lib/supabase/server";
import AsignarComprobantesForm from "@/components/AsignarComprobantesForm";
import ComprobantesTable from "@/components/ComprobantesTable";
import { getCurrentProfile, isSupervisorOrAdmin, getProfilesMap } from "@/lib/auth";

export const dynamic = "force-dynamic";

const ESTADO_LABELS = {
  disponible: "Disponible",
  usado: "Usado",
  anulado: "Anulado",
};

export default async function ComprobantesPage() {
  const supabase = await createClient();
  const me = await getCurrentProfile(supabase);
  const canManage = isSupervisorOrAdmin(me);

  const [{ data: doctors }, { data: comprobantes }, profilesMap] = await Promise.all([
    supabase.from("doctors").select("id, nombre").order("nombre"),
    supabase
      .from("comprobantes")
      .select(
        "id, numero, estado, monto, vencimiento, used_at, created_at, created_by, doctors(nombre), ars_catalog(nombre), relaciones(id)"
      )
      .order("created_at", { ascending: false })
      .limit(500),
    getProfilesMap(supabase),
  ]);

  const summary = { disponible: 0, usado: 0, anulado: 0 };
  for (const c of comprobantes || []) summary[c.estado] = (summary[c.estado] || 0) + 1;

  return (
    <div>
      <h1 className="mb-1 text-lg font-semibold text-slate-900">Comprobantes</h1>
      <p className="mb-4 text-sm text-slate-500">
        Cada médico tiene un número limitado de comprobantes (NCF). Al generar
        la <strong>hoja de presentación</strong> de una relación se puede
        vincular uno — queda registrado a qué ARS se usó, por qué monto, y
        con un link a la relación, para consultas futuras.
      </p>

      <div className="mb-6 grid grid-cols-3 gap-3 max-w-md">
        {Object.entries(ESTADO_LABELS).map(([estado, label]) => (
          <div key={estado} className="rounded-xl border border-slate-200 bg-white p-3 text-center">
            <div className="text-2xl font-semibold text-slate-900">{summary[estado] || 0}</div>
            <div className="text-xs text-slate-500">{label}</div>
          </div>
        ))}
      </div>

      {canManage ? (
        <AsignarComprobantesForm doctors={doctors || []} />
      ) : (
        <p className="mb-6 text-xs text-slate-400">
          Solo un admin o supervisor puede asignar rangos de comprobantes nuevos.
        </p>
      )}

      <ComprobantesTable
        comprobantes={comprobantes || []}
        profilesMap={profilesMap}
        canManage={canManage}
      />
    </div>
  );
}
