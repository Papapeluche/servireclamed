import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/LogoutButton";
import { getCurrentProfile, isAdmin } from "@/lib/auth";

export default async function AppLayout({ children }) {
  const supabase = await createClient();
  const me = await getCurrentProfile(supabase);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <nav className="flex items-center gap-4 text-sm font-medium text-slate-600">
            <Link href="/dashboard" className="text-slate-900">
              ServiReclaMed
            </Link>
            <Link href="/capturar" className="hover:text-brand-600">
              Capturar
            </Link>
            <Link href="/relaciones" className="hover:text-brand-600">
              Relaciones
            </Link>
            <Link href="/plantillas" className="hover:text-brand-600">
              Formatos
            </Link>
            <Link href="/medicos" className="hover:text-brand-600">
              Médicos
            </Link>
            <Link href="/comprobantes" className="hover:text-brand-600">
              Comprobantes
            </Link>
            {isAdmin(me) && (
              <Link href="/usuarios" className="hover:text-brand-600">
                Usuarios
              </Link>
            )}
          </nav>
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <span>{me?.full_name || me?.email}</span>
            {me?.role && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                {me.role}
              </span>
            )}
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
