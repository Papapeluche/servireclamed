import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DoctorEditor from "@/components/DoctorEditor";
import DoctorWorkbench from "@/components/DoctorWorkbench";
import DoctorArsCodigos from "@/components/DoctorArsCodigos";
import BackLink from "@/components/BackLink";

export const dynamic = "force-dynamic";

export default async function EditarMedicoPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: doctor, error }, { data: arsOptions }, { data: relaciones }, { data: comprobantes }] =
    await Promise.all([
      supabase
        .from("doctors")
        .select("*, doctor_ars_codigos(ars_id, codigo)")
        .eq("id", id)
        .single(),
      supabase.from("ars_catalog").select("id, nombre").eq("activo", true).order("nombre"),
      supabase
        .from("relaciones")
        .select("id, fecha, estado, total_monto, ars_id, hoja_generada_at, ars_catalog(nombre)")
        .eq("doctor_id", id)
        .order("fecha", { ascending: false }),
      supabase
        .from("comprobantes")
        .select(
          "id, numero, estado, monto, used_at, vencimiento, relacion_id, ars_id, ars_catalog(nombre), relaciones(id, fecha, total_monto, hoja_generada_at)"
        )
        .eq("doctor_id", id)
        .order("created_at", { ascending: false }),
    ]);

  if (error || !doctor) notFound();

  const codigos = doctor.doctor_ars_codigos || [];
  const relacionesList = relaciones || [];
  const comprobantesList = comprobantes || [];
  const montoHistorico = relacionesList.reduce((sum, r) => sum + Number(r.total_monto || 0), 0);

  const in30 = new Date();
  in30.setDate(in30.getDate() + 30);
  const porVencerCount = comprobantesList.filter(
    (c) => c.estado === "disponible" && c.vencimiento && new Date(c.vencimiento) <= in30
  ).length;

  return (
    <div>
      <BackLink href="/medicos">Volver a médicos</BackLink>
      <h1 className="mb-1 text-lg font-semibold text-slate-900">{doctor.nombre}</h1>
      <p className="mb-4 text-sm text-slate-500">
        Mesa de trabajo del médico: sus datos, su facturación por ARS y los
        comprobantes (NCF) que ya usó.
      </p>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="ARS con código" value={codigos.length} />
        <StatTile label="Relaciones" value={relacionesList.length} />
        <StatTile label="Monto histórico" value={`RD$ ${montoHistorico.toFixed(2)}`} />
        <StatTile
          label="NCF por vencer"
          value={porVencerCount}
          warn={porVencerCount > 0}
        />
      </div>

      <DoctorArsCodigos doctorId={doctor.id} codigos={codigos} arsOptions={arsOptions || []} />

      <details className="mb-8 rounded-xl border border-slate-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-semibold text-slate-800">
          Editar datos del médico
        </summary>
        <div className="mt-4">
          <DoctorEditor doctor={doctor} arsOptions={arsOptions || []} hideCodigos />
        </div>
      </details>

      <DoctorWorkbench
        arsOptions={arsOptions || []}
        relaciones={relacionesList}
        comprobantes={comprobantesList}
      />
    </div>
  );
}

function StatTile({ label, value, warn = false }) {
  return (
    <div
      className={`rounded-xl border p-3 text-center ${
        warn ? "border-warn-500 bg-warn-100/40" : "border-slate-200 bg-white"
      }`}
    >
      <div className={`text-xl font-semibold ${warn ? "text-warn-700" : "text-slate-900"}`}>{value}</div>
      <div className={`text-xs ${warn ? "text-warn-700" : "text-slate-500"}`}>{label}</div>
    </div>
  );
}
