import { createClient } from "@/lib/supabase/server";
import AsignarComprobantesForm from "@/components/AsignarComprobantesForm";
import ComprobantesTable from "@/components/ComprobantesTable";

export const dynamic = "force-dynamic";

const ESTADO_LABELS = {
  disponible: "Disponible",
  usado: "Usado",
  anulado: "Anulado",
};

export default async function ComprobantesPage() {
  const supabase = await createClient();

  const [{ data: doctors }, { data: comprobantes }] = await Promise.all([
    supabase.from("doctors").select("id, nombre").order("nombre"),
    supabase
      .from("comprobantes")
      .select("id, numero, estado, monto, vencimiento, used_at, created_at, doctors(nombre), ars_catalog(nombre), relaciones(id)")
      .order("created_at", { ascending: false })
      .limit(500),
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

      <AsignarComprobantesForm doctors={doctors || []} />

      <ComprobantesTable comprobantes={comprobantes || []} />
    </div>
  );
}
