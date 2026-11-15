import type { Metadata } from "next";

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
  return <PrototypeRouter section={section} segments={slug} />;
}
