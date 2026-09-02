import { createClient } from "@/lib/supabase/server";
import AsignarComprobantesForm from "@/components/AsignarComprobantesForm";
import AnularComprobanteButton from "@/components/AnularComprobanteButton";

export const dynamic = "force-dynamic";

const ESTADO_LABELS = {
  disponible: "Disponible",
  usado: "Usado",
  anulado: "Anulado",
};

const ESTADO_STYLES = {
  disponible: "bg-emerald-100 text-emerald-700",
  usado: "bg-slate-200 text-slate-700",
  anulado: "bg-red-100 text-red-700",
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

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2">Número</th>
              <th className="px-4 py-2">Médico</th>
              <th className="px-4 py-2">Vence</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2">ARS usado</th>
              <th className="px-4 py-2">Monto</th>
              <th className="px-4 py-2">Fecha de uso</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {(comprobantes || []).map((c) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="px-4 py-2 font-mono text-xs">{c.numero}</td>
                <td className="px-4 py-2">{c.doctors?.nombre || "—"}</td>
                <td className="px-4 py-2 text-slate-500">{c.vencimiento || "—"}</td>
                <td className="px-4 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ESTADO_STYLES[c.estado]}`}>
                    {ESTADO_LABELS[c.estado]}
                  </span>
                </td>
                <td className="px-4 py-2 text-slate-500">{c.ars_catalog?.nombre || "—"}</td>
                <td className="px-4 py-2 text-slate-500">
                  {c.monto ? `RD$ ${Number(c.monto).toFixed(2)}` : "—"}
                </td>
                <td className="px-4 py-2 text-slate-500">
                  {c.used_at ? new Date(c.used_at).toLocaleDateString("es-DO") : "—"}
                </td>
                <td className="px-4 py-2">
                  {c.estado === "disponible" && <AnularComprobanteButton id={c.id} />}
                  {c.estado === "usado" && c.relaciones?.id && (
                    <a
                      href={`/api/relaciones/${c.relaciones.id}/export`}
                      className="text-xs text-brand-600 hover:underline"
                    >
                      Ver relación
                    </a>
                  )}
                </td>
              </tr>
            ))}
            {(!comprobantes || comprobantes.length === 0) && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                  Aún no hay comprobantes asignados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
