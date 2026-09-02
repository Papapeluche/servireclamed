import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TemplateEditor from "@/components/TemplateEditor";
import BackLink from "@/components/BackLink";
import { getCurrentProfile, isAdmin } from "@/lib/auth";

export default async function NuevaPlantillaPage() {
  const supabase = await createClient();
  const me = await getCurrentProfile(supabase);
  if (!isAdmin(me)) redirect("/plantillas");

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
