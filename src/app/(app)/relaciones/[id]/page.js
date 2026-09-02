import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DescargarPlantillaButton from "@/components/DescargarPlantillaButton";
import GenerarHojaPresentacionButton from "@/components/GenerarHojaPresentacionButton";

export const dynamic = "force-dynamic";

export default async function RelacionDetallePage({ params }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: relacion, error } = await supabase
    .from("relaciones")
    .select(
      "id, fecha, estado, total_monto, doctor_id, doctor_nombre, doctor_cedula, doctor_rnc, doctor_codigo, especialidad, centro_medico, telefono_medico, ars_id, hoja_generada_at, ars_catalog(id, nombre, rnc)"
    )
    .eq("id", id)
    .single();

  if (error || !relacion) notFound();

  const [{ data: rows }, { data: comprobante }, { data: relacionTemplates }, { data: hojaTemplates }] =
    await Promise.all([
      supabase
        .from("relacion_claims")
        .select("orden, claims(*)")
        .eq("relacion_id", id)
        .order("orden", { ascending: true }),
      supabase
        .from("comprobantes")
        .select("id, numero, monto, used_at, vencimiento")
        .eq("relacion_id", id)
        .maybeSingle(),
      supabase
        .from("export_templates")
        .select("id, nombre, ars_id, header_fields, table_columns")
        .eq("tipo", "relacion"),
      supabase
        .from("export_templates")
        .select("id, nombre, ars_id, header_fields, categorias")
        .eq("tipo", "hoja_presentacion"),
    ]);

  const claims = (rows || []).map((r) => r.claims).filter(Boolean);

  return (
    <div>
      <p className="mb-1 text-xs text-slate-400">
        <Link href="/relaciones" className="hover:underline">
          Relaciones
        </Link>{" "}
        / Detalle
      </p>
      <h1 className="mb-1 text-lg font-semibold text-slate-900">
        {relacion.ars_catalog?.nombre} — {relacion.doctor_nombre || "(médico sin especificar)"}
      </h1>
      <p className="mb-6 text-sm text-slate-500">
        {relacion.fecha} · {claims.length} reclamación(es) · Total RD${" "}
        {Number(relacion.total_monto).toFixed(2)}
      </p>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold text-slate-800">Datos del médico</h2>
          <dl className="space-y-1 text-sm">
            <Row label="Nombre" value={relacion.doctor_nombre} />
            <Row label="Cédula" value={relacion.doctor_cedula} />
            <Row label="RNC" value={relacion.doctor_rnc} />
            <Row label="Código en esta ARS" value={relacion.doctor_codigo} />
            <Row label="Especialidad" value={relacion.especialidad} />
            <Row label="Centro médico" value={relacion.centro_medico} />
          </dl>
          {relacion.doctor_id && (
            <Link
              href={`/medicos/${relacion.doctor_id}`}
              className="mt-2 inline-block text-xs text-brand-600 hover:underline"
            >
              Ver mesa de trabajo del médico →
            </Link>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold text-slate-800">Comprobante (NCF)</h2>
          {comprobante ? (
            <dl className="space-y-1 text-sm">
              <Row label="Número" value={comprobante.numero} />
              <Row label="Monto facturado" value={`RD$ ${Number(comprobante.monto).toFixed(2)}`} />
              <Row
                label="Usado el"
                value={comprobante.used_at ? new Date(comprobante.used_at).toLocaleString() : "—"}
              />
              <Row label="Vencimiento" value={comprobante.vencimiento} />
            </dl>
          ) : (
            <p className="text-sm text-slate-400">
              {relacion.hoja_generada_at
                ? "La hoja de presentación se generó sin consumir un comprobante."
                : "Todavía no se ha generado la hoja de presentación para esta relación."}
            </p>
          )}
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <DescargarPlantillaButton
          relacionId={relacion.id}
          templates={(relacionTemplates || []).filter(
            (t) => !t.ars_id || t.ars_id === relacion.ars_id
          )}
        />
        <GenerarHojaPresentacionButton
          relacionId={relacion.id}
          templates={(hojaTemplates || []).filter((t) => !t.ars_id || t.ars_id === relacion.ars_id)}
          comprobante={null}
        />
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Reclamaciones incluidas</h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-2">Afiliado</th>
                <th className="px-4 py-2">Servicio</th>
                <th className="px-4 py-2">Fecha</th>
                <th className="px-4 py-2">Monto</th>
              </tr>
            </thead>
            <tbody>
              {claims.map((c) => (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">
                    <Link href={`/reclamaciones/${c.id}`} className="text-brand-600 hover:underline">
                      {c.afiliado_nombre || "(sin nombre)"}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-slate-600">{c.tipo_servicio || "—"}</td>
                  <td className="px-4 py-2 text-slate-500">{c.fecha_servicio || "—"}</td>
                  <td className="px-4 py-2">RD$ {Number(c.monto || 0).toFixed(2)}</td>
                </tr>
              ))}
              {claims.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                    Sin reclamaciones.
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

function Row({ label, value }) {
  return (
    <div className="flex gap-2">
      <dt className="w-40 shrink-0 text-slate-500">{label}</dt>
      <dd className="text-slate-800">{value || "—"}</dd>
    </div>
  );
}
