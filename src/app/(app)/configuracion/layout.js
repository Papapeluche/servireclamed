import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, isAdmin } from "@/lib/auth";
import BackLink from "@/components/BackLink";
import ConfiguracionTabs from "@/components/ConfiguracionTabs";

export const dynamic = "force-dynamic";

export default async function ConfiguracionLayout({ children }) {
  const supabase = await createClient();
  const me = await getCurrentProfile(supabase);
  if (!isAdmin(me)) redirect("/dashboard");

  return (
    <div>
      <BackLink href="/dashboard">Volver al dashboard</BackLink>
      <h1 className="mb-1 text-lg font-semibold text-slate-900">Configuración</h1>
      <p className="mb-4 text-sm text-slate-500">
        Usuarios, roles, y el historial de acciones importantes del sistema.
      </p>

      <ConfiguracionTabs />

      {children}
    </div>
  );
}
