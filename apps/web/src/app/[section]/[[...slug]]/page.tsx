import type { Metadata } from "next";
import { Suspense } from "react";

import { PrototypeRouter } from "@/components/prototype/PrototypeRouter";

export const metadata: Metadata = {
  title: "RiverGuard workspace",
};

export default async function RoutedPrototypePage({
  params,
}: {
  params: Promise<{ section: string; slug?: string[] }>;
}) {
  const { section, slug = [] } = await params;
  // Same reason as the root page: screens read useSearchParams.
  return (
    <Suspense fallback={null}>
      <PrototypeRouter section={section} segments={slug} />
    </Suspense>
  );
}
