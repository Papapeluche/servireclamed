"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SearchInput from "@/components/SearchInput";

export default function DashboardSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") || "");
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (q.trim()) params.set("q", q.trim());
      else params.delete("q");
      params.delete("pagina");
      const qs = params.toString();
      router.push(qs ? `/dashboard?${qs}` : "/dashboard");
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, 350);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <SearchInput
      value={q}
      onChange={setQ}
      placeholder="Buscar por paciente, cédula, médico o código..."
      className="max-w-sm"
    />
  );
}
