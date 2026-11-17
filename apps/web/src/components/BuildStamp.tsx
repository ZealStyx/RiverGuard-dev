/**
 * The commit this page was served from, and when that commit was made.
 *
 * Deliberately visible and deliberately small: when someone reports "the site
 * still says <old copy>", the first question is whether they are looking at this
 * build at all. Compare this string with the `[riverguard] build …` line the
 * server prints at startup. It is derived from git metadata, so it is identical
 * on the server and in the client bundle.
 */

export const appBuild = process.env.NEXT_PUBLIC_APP_BUILD;

export function BuildStamp({ className }: { className?: string }) {
  if (!appBuild) return null;
  return (
    <span
      className={className}
      title="Commit this page was served from, and that commit's time. Compare it with the server's startup line."
    >
      build {appBuild}
    </span>
  );
}
