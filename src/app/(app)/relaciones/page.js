import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import RelacionGroupCard from "@/components/RelacionGroupCard";
import RelacionesHistorial from "@/components/RelacionesHistorial";

export const dynamic = "force-dynamic";

export default async function RelacionesPage() {
  const supabase = await createClient();

  // Todo lo que aún no se ha convertido en relación se organiza solo, por
  // ARS + médico, a medida que se va digitando — sin tener que "crear" nada
  // a mano primero. Se muestran también pendiente/en_proceso para que se
  // vea el avance del lote completo, aunque solo lo revisado se puede
  // convertir todavía.
  const { data: activeClaims } = await supabase
    .from("claims")
    .select(
      "id, status, monto, ars_id, doctor_id, doctor_nombre, doctor_codigo, ars_catalog(id, nombre)"
    )
    .in("status", ["pendiente", "en_proceso", "revisado"]);

  // Agrupar por doctor_id (la FK real) cuando existe, en vez de por el
  // texto de doctor_nombre — un typo, un espacio de más o una mayúscula
  // distinta entre dos reclamaciones del MISMO médico ya no las separa en
  // dos grupos falsos. Si el médico todavía no está en el catálogo
  // (doctor_id nulo), se cae al texto como antes — sigue siendo estricto
  // porque nunca mezcla dos médicos con doctor_id distinto, solo agrupa por
  // texto cuando de plano no hay con qué identificarlo mejor.
  const groups = new Map();
  for (const c of activeClaims || []) {
    if (!c.ars_id) continue;
    const key = c.doctor_id
      ? `${c.ars_id}::id:${c.doctor_id}`
      : `${c.ars_id}::texto:${c.doctor_nombre || ""}::${c.doctor_codigo || ""}`;
    if (!groups.has(key)) {
      groups.set(key, {
        arsId: c.ars_id,
        ars: c.ars_catalog,
        doctorId: c.doctor_id,
        doctorNombre: c.doctor_nombre,
        doctorCodigo: c.doctor_codigo,
        pendiente: 0,
        en_proceso: 0,
        revisado: 0,
        totalRevisado: 0,
      });
    }
    const entry = groups.get(key);
    entry[c.status] += 1;
    if (c.status === "revisado") entry.totalRevisado += Number(c.monto || 0);
  }

  const { data: relacionTemplates } = await supabase
    .from("export_templates")
    .select("id, nombre, ars_id, header_fields, table_columns")
    .eq("tipo", "relacion");

  const { data: relaciones } = await supabase
    .from("relaciones")
    .select(
      "id, fecha, estado, total_monto, doctor_id, doctor_nombre, doctor_codigo, doctor_cedula, ars_id, ars_catalog(nombre)"
    )
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="mb-1 text-lg font-semibold text-slate-900">Relaciones</h1>
      <p className="mb-6 text-sm text-slate-500">
        Se organizan solas por ARS + médico a medida que digitas — no hace
        falta crear nada a mano. En cuanto un grupo tiene reclamaciones
        revisadas, aparecen los dos botones para convertirlo en el documento
        que necesites.
      </p>

      {groups.size === 0 ? (
        <p className="mb-8 text-sm text-slate-400">
          Todavía no hay reclamaciones capturadas.
        </p>
      ) : (
        <div className="mb-8 grid gap-3 sm:grid-cols-2">
          {Array.from(groups.entries()).map(([key, entry]) => (
            <RelacionGroupCard
              key={key}
              entry={entry}
              relacionTemplates={(relacionTemplates || []).filter(
                (t) => !t.ars_id || t.ars_id === entry.arsId
              )}
            />
          ))}
        </div>
      )}

      <RelacionesHistorial relaciones={relaciones || []} />

      <p className="mt-4 text-xs text-slate-400">
        ¿Formatos por ARS?{" "}
        <Link href="/plantillas" className="text-brand-600 hover:underline">
          Ajústalos aquí
        </Link>{" "}
        — ya vienen listos de fábrica (uno para relación y otro para hoja de
        presentación), esto es solo para cuando alguna ARS pida algo distinto.
      </p>
    </div>
  );
}
