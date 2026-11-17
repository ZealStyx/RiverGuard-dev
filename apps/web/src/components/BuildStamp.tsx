/**
 * The commit and time this bundle was built.
 *
 * Deliberately visible and deliberately small: when someone reports "the site
 * still says <old copy>", the first question is whether they are looking at this
 * build at all. Compare this string with the `[riverguard] build …` line the
 * server prints at startup.
 */

export const appBuild = process.env.NEXT_PUBLIC_APP_BUILD;

export function BuildStamp({ className }: { className?: string }) {
  if (!appBuild) return null;
  return (
    <span
      className={className}
      title="Commit and build time of the bundle this page was loaded from. Compare it with the server's startup line."
    >
      build {appBuild}
    </span>
  );
}
