import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section className={cn("rounded-2xl bg-card p-5 shadow-card sm:p-6", className)}>
      {children}
    </section>
  );
}
