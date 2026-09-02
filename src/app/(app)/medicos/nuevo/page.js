import { createClient } from "@/lib/supabase/server";
import DoctorEditor from "@/components/DoctorEditor";

export default async function NuevoMedicoPage() {
  const supabase = await createClient();
  const { data: arsOptions } = await supabase
    .from("ars_catalog")
    .select("id, nombre")
    .eq("activo", true)
    .order("nombre");

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-slate-900">Nuevo médico</h1>
      <DoctorEditor arsOptions={arsOptions || []} />
    </div>
  );
}
