import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PlantillasPage() {
  const supabase = await createClient();
  const { data: templates } = await supabase
    .from("export_templates")
    .select("id, nombre, tipo, ars_catalog(nombre)")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Plantillas de relación</h1>
        <Link
          href="/plantillas/nueva"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          + Nueva plantilla
        </Link>
      </div>

      <p className="mb-4 text-sm text-slate-500">
        Cada ARS puede tener su propia plantilla: eliges qué campos van en el
        encabezado (datos del médico) y qué columnas van en la tabla (datos
        de cada reclamación), en el orden que quieras. Al generar una
        relación para esa ARS, se usa automáticamente.
      </p>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2">Nombre</th>
              <th className="px-4 py-2">ARS</th>
              <th className="px-4 py-2">Tipo</th>
            </tr>
          </thead>
          <tbody>
            {(templates || []).map((t) => (
              <tr key={t.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-2">
                  <Link href={`/plantillas/${t.id}`} className="text-brand-600 hover:underline">
                    {t.nombre}
                  </Link>
                </td>
                <td className="px-4 py-2">{t.ars_catalog?.nombre || "Genérica"}</td>
                <td className="px-4 py-2">
                  {t.tipo === "hoja_presentacion" ? "Hoja de presentación" : "Relación"}
                </td>
              </tr>
            ))}
            {(!templates || templates.length === 0) && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                  Aún no hay plantillas. Las relaciones se exportan con un
                  formato genérico hasta que crees una.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
