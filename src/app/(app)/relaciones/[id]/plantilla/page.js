import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BackLink from "@/components/BackLink";
import RelacionTemplatePreview from "@/components/RelacionTemplatePreview";
import {
  DEFAULT_RELACION_HEADER_FIELDS,
  DEFAULT_RELACION_TABLE_COLUMNS,
  buildRelacionValues,
} from "@/lib/relacionFields";

export const dynamic = "force-dynamic";

export default async function RelacionPlantillaPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: relacion, error } = await supabase
    .from("relaciones")
    .select(
      "id, fecha, template_id, doctor_nombre, doctor_cedula, doctor_rnc, doctor_codigo, especialidad, centro_medico, telefono_medico, ars_id, ars_catalog(nombre, rnc)"
    )
    .eq("id", id)
    .single();

  if (error || !relacion) notFound();

  // Mismo criterio que la ruta que genera el archivo real: si la relación
  // ya tiene una plantilla guardada, es la que se propone primero, y luego
  // el resto de plantillas de relación de esa ARS (o genéricas) por si se
  // quiere cambiar antes de descargar.
  let savedTemplate = null;
  if (relacion.template_id) {
    const { data } = await supabase
      .from("export_templates")
      .select("id, nombre, ars_id, header_fields, table_columns")
      .eq("id", relacion.template_id)
      .single();
    savedTemplate = data;
  }

  const [{ data: rows }, { data: templatesForArs }] = await Promise.all([
    supabase.from("relacion_claims").select("orden, claims(*)").eq("relacion_id", id).order("orden"),
    supabase
      .from("export_templates")
      .select("id, nombre, ars_id, header_fields, table_columns")
      .eq("tipo", "relacion")
      .or(`ars_id.eq.${relacion.ars_id},ars_id.is.null`)
      .order("ars_id", { ascending: true, nullsFirst: false }),
  ]);

  const templates = savedTemplate
    ? [savedTemplate, ...(templatesForArs || []).filter((t) => t.id !== savedTemplate.id)]
    : templatesForArs || [];

  const claims = (rows || []).map((r) => r.claims).filter(Boolean);
  const relacionValues = buildRelacionValues(relacion);

  return (
    <div>
      <BackLink href={`/relaciones/${id}`}>Volver a la relación</BackLink>
      <RelacionTemplatePreview
        relacionId={id}
        relacionValues={relacionValues}
        claims={claims}
        templates={templates}
        defaultHeaderFields={DEFAULT_RELACION_HEADER_FIELDS}
        defaultTableColumns={DEFAULT_RELACION_TABLE_COLUMNS}
      />
    </div>
  );
}
