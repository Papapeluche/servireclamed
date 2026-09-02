import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BackLink from "@/components/BackLink";
import HojaPresentacionPreview from "@/components/HojaPresentacionPreview";
import {
  DEFAULT_HOJA_HEADER_FIELDS,
  DEFAULT_HOJA_CATEGORIAS,
  buildRelacionValues,
} from "@/lib/relacionFields";

export const dynamic = "force-dynamic";

export default async function RelacionHojaPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: relacion, error } = await supabase
    .from("relaciones")
    .select(
      "id, fecha, doctor_id, doctor_nombre, doctor_cedula, doctor_rnc, doctor_codigo, especialidad, centro_medico, telefono_medico, ars_id, ars_catalog(nombre, rnc)"
    )
    .eq("id", id)
    .single();

  if (error || !relacion) notFound();

  const [{ data: rows }, { data: templatesForArs }, { data: comprobanteUsado }] = await Promise.all([
    supabase.from("relacion_claims").select("claims(tipo_servicio, monto)").eq("relacion_id", id),
    supabase
      .from("export_templates")
      .select("id, nombre, ars_id, header_fields, categorias")
      .eq("tipo", "hoja_presentacion")
      .or(`ars_id.eq.${relacion.ars_id},ars_id.is.null`)
      .order("ars_id", { ascending: true, nullsFirst: false }),
    supabase
      .from("comprobantes")
      .select("id, numero, vencimiento")
      .eq("relacion_id", id)
      .maybeSingle(),
  ]);

  let comprobanteDisponible = null;
  if (!comprobanteUsado && relacion.doctor_id) {
    const { data } = await supabase
      .from("comprobantes")
      .select("id, numero, vencimiento")
      .eq("estado", "disponible")
      .eq("doctor_id", relacion.doctor_id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    comprobanteDisponible = data;
  }

  const claims = (rows || []).map((r) => r.claims).filter(Boolean);
  const relacionValues = buildRelacionValues(relacion);

  return (
    <div>
      <BackLink href={`/relaciones/${id}`}>Volver a la relación</BackLink>
      <HojaPresentacionPreview
        relacionId={id}
        relacionValues={relacionValues}
        claims={claims}
        templates={templatesForArs || []}
        comprobanteUsado={comprobanteUsado}
        comprobanteDisponible={comprobanteDisponible}
        defaultHeaderFields={DEFAULT_HOJA_HEADER_FIELDS}
        defaultCategorias={DEFAULT_HOJA_CATEGORIAS}
      />
    </div>
  );
}
