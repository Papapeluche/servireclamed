import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/LogoutButton";

export default async function AppLayout({ children }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
              Plantillas
            </Link>
            <Link href="/medicos" className="hover:text-brand-600">
              Médicos
            </Link>
          </nav>
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <span>{user?.email}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
