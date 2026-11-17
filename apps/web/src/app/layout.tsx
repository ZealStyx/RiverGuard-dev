import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";

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
    <html lang="en" className={GeistSans.variable}>
      <body>
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
