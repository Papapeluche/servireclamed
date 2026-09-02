import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PlantillasPage() {
  const supabase = await createClient();
  const me = await getCurrentProfile(supabase);
  const admin = isAdmin(me);

  const { data: templates } = await supabase
    .from("export_templates")
    .select("id, nombre, tipo, ars_catalog(nombre)")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Formatos (plantillas)</h1>
        {admin && (
          <Link
            href="/plantillas/nueva"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            + Nueva plantilla
          </Link>
        )}
      </div>

      <p className="mb-4 text-sm text-slate-500">
        Ya vienen dos formatos genéricos listos de fábrica — uno para
        relación y otro para hoja de presentación — así que{" "}
        <strong>normalmente nunca hace falta entrar aquí</strong>: desde{" "}
        <Link href="/relaciones" className="text-brand-600 hover:underline">
          Relaciones
        </Link>{" "}
        conviertes directo con esos formatos. Esta pantalla es solo para
        cuando una ARS en particular pida un formato de entrega distinto al
        estándar: aquí ajustas qué campos van en el encabezado y qué
        columnas o categorías lleva, y le asignas esa ARS específica.
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
                  {admin ? (
                    <Link href={`/plantillas/${t.id}`} className="text-brand-600 hover:underline">
                      {t.nombre}
                    </Link>
                  ) : (
                    t.nombre
                  )}
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
