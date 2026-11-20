import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PrototypeRouter } from "@/components/prototype/PrototypeRouter";
import { isKnownSection } from "@/lib/sections";

export const metadata: Metadata = {
  title: "RiverGuard workspace",
};

export default async function RoutedPrototypePage({
  params,
}: {
  params: Promise<{ section: string; slug?: string[] }>;
}) {
  const { section, slug = [] } = await params;

  // Reject unknown paths here rather than letting the client router answer them
  // with the welcome page and a 200. `notFound()` renders app/not-found.tsx with
  // a real 404 status.
  if (!isKnownSection(section)) notFound();

  // Same reason as the root page: screens read useSearchParams.
  return (
    <Suspense fallback={null}>
      <PrototypeRouter section={section} segments={slug} />
    </Suspense>
  );
}
