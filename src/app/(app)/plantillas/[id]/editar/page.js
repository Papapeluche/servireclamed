import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TemplateEditor from "@/components/TemplateEditor";
import BackLink from "@/components/BackLink";
import { getCurrentProfile, isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function EditarPlantillaPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const me = await getCurrentProfile(supabase);
  if (!isAdmin(me)) redirect(`/plantillas/${id}`);

  const [{ data: template, error }, { data: arsOptions }] = await Promise.all([
    supabase.from("export_templates").select("*").eq("id", id).single(),
    supabase.from("ars_catalog").select("id, nombre").eq("activo", true).order("nombre"),
  ]);

  if (error || !template) notFound();

  return (
    <div>
      <BackLink href={`/plantillas/${id}`}>Volver a la vista previa</BackLink>
      <h1 className="mb-4 text-lg font-semibold text-slate-900">Editar plantilla</h1>
      <TemplateEditor template={template} arsOptions={arsOptions || []} />
    </div>
  );
}
