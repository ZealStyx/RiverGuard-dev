import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found · RiverGuard",
};

/**
 * Rendered (with a 404 status) for any path the application does not serve.
 * `app/[section]/` is a catch-all, so without this an unknown URL reached the
 * welcome screen and answered 200.
 */
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-4 p-6">
      <p className="text-label text-muted">404</p>
      <h1 className="text-heading">This page does not exist</h1>
      <p className="text-body text-muted">
        The address you followed is not part of RiverGuard. Check the spelling,
        or start again from a screen that exists.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link className="text-body underline" href="/welcome">
          Back to the welcome page
        </Link>
        <Link className="text-body underline" href="/resident">
          Resident dashboard
        </Link>
      </div>
    </main>
  );
}
