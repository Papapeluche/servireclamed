import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, isAdmin } from "@/lib/auth";
import UsuariosTable from "@/components/UsuariosTable";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const supabase = await createClient();
  const me = await getCurrentProfile(supabase);

  if (!isAdmin(me)) redirect("/dashboard");

  const { data: usuarios } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, created_at")
    .order("created_at", { ascending: true });

  return (
    <div>
      <h1 className="mb-1 text-lg font-semibold text-slate-900">Usuarios</h1>
      <p className="mb-6 text-sm text-slate-500">
        Quién tiene cuenta en el sistema y qué puede hacer. Un <strong>admin</strong>{" "}
        puede todo, incluyendo cambiar roles, borrar médicos, formatos, y
        asignar/anular comprobantes. Un <strong>supervisor</strong> puede
        asignar y anular comprobantes pero no borrar médicos ni tocar
        formatos. Un <strong>digitador</strong> captura y digita reclamaciones,
        genera relaciones y hojas de presentación, pero no puede hacer
        cambios estructurales ni de otros usuarios.
      </p>

      <UsuariosTable usuarios={usuarios || []} currentUserId={me.id} />

      <p className="mt-4 text-xs text-slate-400">
        Para crear una cuenta nueva todavía hay que hacerlo desde el
        dashboard de Supabase (Authentication → Users → Add user) — entra
        automáticamente aquí con rol &quot;digitador&quot; y luego se le puede
        subir el rol desde esta pantalla.
      </p>
    </div>
  );
}
