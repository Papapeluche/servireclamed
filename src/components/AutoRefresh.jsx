"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AutoRefresh({ seconds = 15 }) {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(interval);
  }, [router, seconds]);

  return null;
}
