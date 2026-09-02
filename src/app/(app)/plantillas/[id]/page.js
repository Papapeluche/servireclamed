import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TemplatePreview from "@/components/TemplatePreview";
import BackLink from "@/components/BackLink";
import { getCurrentProfile, isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PlantillaPreviewPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const me = await getCurrentProfile(supabase);

  const { data: template, error } = await supabase
    .from("export_templates")
    .select("*, ars_catalog(nombre)")
    .eq("id", id)
    .single();

  if (error || !template) notFound();

  return (
    <div>
      <BackLink href="/plantillas">Volver a formatos</BackLink>
      <TemplatePreview template={template} canEdit={isAdmin(me)} />
    </div>
  );
}
