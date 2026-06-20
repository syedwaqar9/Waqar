"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Polls the server while a week is still generating, so the page updates as
// posts finish. The generation itself runs server-side and is not affected by
// this component unmounting.
export default function GeneratingWatcher() {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(t);
  }, [router]);
  return null;
}
