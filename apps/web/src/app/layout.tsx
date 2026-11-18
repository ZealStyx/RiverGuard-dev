import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";

import { FirebaseAuthProvider } from "@/components/auth/FirebaseAuthProvider";
import { THEME_PREPAINT_SCRIPT } from "@/lib/theme-script";

import { ConvexClientProvider } from "./ConvexClientProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "RiverGuard",
    template: "%s | RiverGuard",
  },
  description:
    "A local research prototype for experimental NCR flood-risk forecasting.",
  // Sent on cross-origin subresource requests (map tiles). OpenStreetMap's tile
  // policy requires a valid Referer from web pages, so this stays at the
  // browser default rather than anything stricter.
  referrer: "strict-origin-when-cross-origin",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // `suppressHydrationWarning` covers `data-theme`, which the prepaint script
    // below sets before React sees the document.
    <html lang="en" className={GeistSans.variable} suppressHydrationWarning>
      <head>
        {/* Applies a stored dark theme before the first paint, so there is no
            white flash on a dark page. See lib/theme.ts. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_PREPAINT_SCRIPT }} />
      </head>
      <body>
        <FirebaseAuthProvider>
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </FirebaseAuthProvider>
      </body>
    </html>
  );
}
