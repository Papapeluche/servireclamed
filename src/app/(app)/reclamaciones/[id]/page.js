import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ClaimEditor from "@/components/ClaimEditor";

export const dynamic = "force-dynamic";

export default async function ReclamacionPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: claim, error }, { data: arsOptions }, { data: doctors }] = await Promise.all([
    supabase.from("claims").select("*").eq("id", id).single(),
    supabase.from("ars_catalog").select("id, nombre").eq("activo", true).order("nombre"),
    supabase
      .from("doctors")
      .select("id, nombre, cedula, especialidad, centro_medico, doctor_ars_codigos(ars_id, codigo)"),
  ]);

  if (error || !claim) notFound();

  const { data: signedUrl } = await supabase.storage
    .from("reclamaciones-imagenes")
    .createSignedUrl(claim.image_path, 60 * 60);

  return (
    <ClaimEditor
      claim={claim}
      imageUrl={signedUrl?.signedUrl}
      arsOptions={arsOptions || []}
      doctors={doctors || []}
    />
  );
}
