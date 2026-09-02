import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TemplateEditor from "@/components/TemplateEditor";

export const dynamic = "force-dynamic";

export default async function EditarPlantillaPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: template, error }, { data: arsOptions }] = await Promise.all([
    supabase.from("export_templates").select("*").eq("id", id).single(),
    supabase.from("ars_catalog").select("id, nombre").eq("activo", true).order("nombre"),
  ]);

  if (error || !template) notFound();

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-slate-900">Editar plantilla</h1>
      <TemplateEditor template={template} arsOptions={arsOptions || []} />
    </div>
  );
}
