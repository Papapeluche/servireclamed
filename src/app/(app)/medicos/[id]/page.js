import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DoctorEditor from "@/components/DoctorEditor";
import DoctorWorkbench from "@/components/DoctorWorkbench";
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

  return (
    <div>
      <BackLink href="/medicos">Volver a médicos</BackLink>
      <h1 className="mb-1 text-lg font-semibold text-slate-900">{doctor.nombre}</h1>
      <p className="mb-6 text-sm text-slate-500">
        Mesa de trabajo del médico: sus datos, su facturación por ARS y los
        comprobantes (NCF) que ya usó.
      </p>

      <details className="mb-8 rounded-xl border border-slate-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-semibold text-slate-800">
          Editar datos / códigos por ARS
        </summary>
        <div className="mt-4">
          <DoctorEditor doctor={doctor} arsOptions={arsOptions || []} />
        </div>
      </details>

      <DoctorWorkbench
        arsOptions={arsOptions || []}
        relaciones={relaciones || []}
        comprobantes={comprobantes || []}
      />
    </div>
  );
}
