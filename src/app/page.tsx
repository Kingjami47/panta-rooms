"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const AppShell = dynamic(() => import("@/components/AppShell").then((m) => m.AppShell), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="size-6 animate-spin text-zinc-600" />
    </div>
  ),
});

export default function Page() {
  return <AppShell />;
}
