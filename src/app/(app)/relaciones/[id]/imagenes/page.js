import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BackLink from "@/components/BackLink";
import ImagenesRelacion from "@/components/ImagenesRelacion";

export const dynamic = "force-dynamic";

export default async function ImagenesPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: relacion } = await supabase.from("relaciones")
    .select("id, doctor_nombre, ars_catalog(nombre)").eq("id", id).maybeSingle();
  if (!relacion) notFound();

  const { data: rows, error } = await supabase.from("relacion_claims")
    .select("orden, claims(id, image_path, afiliado_nombre, fecha_servicio, tipo_servicio)")
    .eq("relacion_id", id).order("orden");
  if (error) throw new Error(error.message);

  const images = await Promise.all((rows || []).map(async (row, index) => {
    const claim = row.claims;
    const { data } = claim?.image_path
      ? await supabase.storage.from("reclamaciones-imagenes").createSignedUrl(claim.image_path, 3600)
      : { data: null };
    return { ...claim, position: index + 1, url: claim?.image_path
      ? `/api/relaciones/${id}/imagenes/${claim.id}` : null, originalUrl: data?.signedUrl || null };
  }));

  return (
    <div>
      <BackLink href={`/relaciones/${id}`}>Volver a la relación</BackLink>
      <h1 className="mb-2 text-xl font-semibold">Relación de imágenes</h1>
      <p className="mb-4 text-sm text-slate-600">
        {relacion.ars_catalog?.nombre} · {relacion.doctor_nombre} · {images.length} reclamaciones.
        El número de cada imagen corresponde a la fila de la relación en Excel.
      </p>
      <div className="mb-5 flex flex-wrap gap-3">
        <Link href={`/relaciones/${id}/plantilla`} className="rounded-lg border px-4 py-2 text-sm">Ver relación de texto</Link>
      </div>
      <ImagenesRelacion images={images} relacionId={id} />
    </div>
  );
}
