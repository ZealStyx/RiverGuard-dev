import { cn } from "@/lib/cn";

export function buttonClass(variant: "solid" | "ghost" = "solid") {
  return cn(
    "inline-flex h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium transition-colors",
    variant === "solid"
      ? "bg-water text-card hover:bg-water-deep"
      : "bg-card text-ink shadow-card hover:shadow-card-hover",
  );
}
