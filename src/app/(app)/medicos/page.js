import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import MedicosTable from "@/components/MedicosTable";

export const dynamic = "force-dynamic";

export default async function MedicosPage() {
  const supabase = await createClient();

  const { data: doctors } = await supabase
    .from("doctors")
    .select("id, nombre, cedula, especialidad, centro_medico, doctor_ars_codigos(codigo, ars_catalog(nombre))")
    .order("nombre");

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Médicos</h1>
        <Link
          href="/medicos/nuevo"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          + Nuevo médico
        </Link>
      </div>
      <p className="mb-4 text-sm text-slate-500">
        Catálogo de médicos y su código ante cada ARS (el código de un médico
        no es el mismo en todas las ARS). Al digitar una reclamación, si el
        médico ya está aquí, sus datos se auto-completan.
      </p>

      <MedicosTable doctors={doctors || []} />
    </div>
  );
}
