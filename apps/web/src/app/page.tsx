import { Suspense } from "react";

import { PrototypeRouter } from "@/components/prototype/PrototypeRouter";

export const metadata = {
  title: "RiverGuard",
};

export default function Home() {
  // The prototype screens read query parameters (useSearchParams), which Next 16
  // requires to sit behind a Suspense boundary so the shell can still prerender.
  return (
    <Suspense fallback={null}>
      <PrototypeRouter section="welcome" />
    </Suspense>
  );
}
