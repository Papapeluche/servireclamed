import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DoctorEditor from "@/components/DoctorEditor";

export const dynamic = "force-dynamic";

export default async function EditarMedicoPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: doctor, error }, { data: arsOptions }] = await Promise.all([
    supabase
      .from("doctors")
      .select("*, doctor_ars_codigos(ars_id, codigo)")
      .eq("id", id)
      .single(),
    supabase.from("ars_catalog").select("id, nombre").eq("activo", true).order("nombre"),
  ]);

  if (error || !doctor) notFound();

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-slate-900">Editar médico</h1>
      <DoctorEditor doctor={doctor} arsOptions={arsOptions || []} />
    </div>
  );
}
