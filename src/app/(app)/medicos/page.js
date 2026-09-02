import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MedicosPage() {
  const supabase = await createClient();

  const { data: doctors } = await supabase
    .from("doctors")
    .select("id, nombre, cedula, especialidad, centro_medico, doctor_ars_codigos(codigo, ars_catalog(nombre))")
    .order("nombre");

  return (
    <div>
      <h1 className="mb-1 text-lg font-semibold text-slate-900">Médicos</h1>
      <p className="mb-4 text-sm text-slate-500">
        Catálogo de médicos y su código ante cada ARS (el código de un médico
        no es el mismo en todas las ARS). Al digitar una reclamación, si el
        médico ya está aquí, sus datos se auto-completan.
      </p>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2">Nombre</th>
              <th className="px-4 py-2">Cédula</th>
              <th className="px-4 py-2">Especialidad</th>
              <th className="px-4 py-2">Códigos por ARS</th>
            </tr>
          </thead>
          <tbody>
            {(doctors || []).map((d) => (
              <tr key={d.id} className="border-t border-slate-100">
                <td className="px-4 py-2">{d.nombre}</td>
                <td className="px-4 py-2 text-slate-500">{d.cedula || "—"}</td>
                <td className="px-4 py-2 text-slate-500">{d.especialidad || "—"}</td>
                <td className="px-4 py-2">
                  <div className="flex flex-wrap gap-1">
                    {(d.doctor_ars_codigos || []).map((c, i) => (
                      <span
                        key={i}
                        className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                      >
                        {c.ars_catalog?.nombre}: {c.codigo}
                      </span>
                    ))}
                    {(!d.doctor_ars_codigos || d.doctor_ars_codigos.length === 0) && (
                      <span className="text-xs text-slate-400">Sin código registrado</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {(!doctors || doctors.length === 0) && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                  Aún no hay médicos cargados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
