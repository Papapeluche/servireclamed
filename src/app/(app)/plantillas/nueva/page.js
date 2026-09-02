import { createClient } from "@/lib/supabase/server";
import TemplateEditor from "@/components/TemplateEditor";
import BackLink from "@/components/BackLink";

export default async function NuevaPlantillaPage() {
  const supabase = await createClient();
  const { data: arsOptions } = await supabase
    .from("ars_catalog")
    .select("id, nombre")
    .eq("activo", true)
    .order("nombre");

  return (
    <div>
      <BackLink href="/plantillas">Volver a formatos</BackLink>
      <h1 className="mb-4 text-lg font-semibold text-slate-900">Nueva plantilla</h1>
      <TemplateEditor arsOptions={arsOptions || []} />
    </div>
  );
}
