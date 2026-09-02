import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import UsuariosTable from "@/components/UsuariosTable";
import CrearUsuarioForm from "@/components/CrearUsuarioForm";

export const dynamic = "force-dynamic";

export default async function ConfiguracionUsuariosPage() {
  const supabase = await createClient();
  const me = await getCurrentProfile(supabase);

  const { data: usuarios } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, created_at")
    .order("created_at", { ascending: true });

  return (
    <div>
      <p className="mb-4 text-sm text-slate-500">
        Un <strong>admin</strong> puede todo, incluyendo cambiar roles, borrar
        médicos, formatos, y asignar/anular comprobantes. Un{" "}
        <strong>supervisor</strong> puede asignar y anular comprobantes pero
        no borrar médicos ni tocar formatos. Un <strong>digitador</strong>{" "}
        captura y digita reclamaciones, genera relaciones y hojas de
        presentación, pero no puede hacer cambios estructurales ni de otros
        usuarios.
      </p>

      <CrearUsuarioForm />

      <UsuariosTable usuarios={usuarios || []} currentUserId={me.id} />
    </div>
  );
}
