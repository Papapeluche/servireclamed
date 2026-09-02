import { createClient } from "@/lib/supabase/server";
import AuditLogTable from "@/components/AuditLogTable";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 100;

export default async function ConfiguracionActividadPage() {
  const supabase = await createClient();

  const { data: eventos } = await supabase
    .from("audit_log")
    .select("id, created_at, actor_name, action, target_type, target_id, details")
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);

  return (
    <div>
      <p className="mb-4 text-sm text-slate-500">
        Registro de acciones importantes: quién borró un médico, quién
        asignó o anuló comprobantes, quién creó o editó formatos, quién
        generó una hoja de presentación, y cambios a cuentas de usuario. No
        se registra el trabajo diario normal (digitar, crear relaciones) —
        eso ya queda como &quot;creado por / digitado por&quot; en cada
        registro. Esta lista no se puede editar ni borrar desde la app, ni
        siquiera por un admin — solo se puede consultar.
      </p>

      <AuditLogTable eventos={eventos || []} />

      {(eventos?.length || 0) >= PAGE_SIZE && (
        <p className="mt-3 text-xs text-slate-400">
          Mostrando los últimos {PAGE_SIZE} eventos.
        </p>
      )}
    </div>
  );
}
