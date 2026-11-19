import { Suspense } from "react";

import { PrototypeRouter } from "@/components/prototype/PrototypeRouter";

export const metadata = {
  title: "RiverGuard",
};

/**
 * Rendered per request, never prerendered.
 *
 * The landing page is an application shell: every pixel of it comes from client
 * state (`useSearchParams`, the router, the verified-layer fetch). Prerendering
 * it therefore stores an empty Suspense fallback — 7 KB of `<head>` and a
 * `<!--$!-->` marker — and leaves the browser to build the whole tree. When the
 * stored HTML and the chunks it references come from different builds, which is
 * exactly what a caching proxy between a rebuild and a reload produces, React
 * reports a hydration mismatch on the first page a visitor sees. Rendering on
 * the server keeps the HTML and the chunks in the same build, and puts the build
 * stamp in the document as well.
 */
export const dynamic = "force-dynamic";

export default function Home() {
  // The prototype screens read query parameters (useSearchParams), which Next 16
  // requires to sit behind a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <PrototypeRouter section="welcome" />
    </Suspense>
  );
}
