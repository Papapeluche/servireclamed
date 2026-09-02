"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/configuracion/usuarios", label: "Usuarios" },
  { href: "/configuracion/actividad", label: "Actividad" },
];

export default function ConfiguracionTabs() {
  const pathname = usePathname();

  return (
    <div className="mb-6 flex gap-4 border-b border-slate-200 text-sm font-medium">
      {TABS.map((tab) => {
        const active = pathname?.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`border-b-2 px-1 pb-2 ${
              active
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-800"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
