import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";

import { FirebaseAuthProvider } from "@/components/auth/FirebaseAuthProvider";

import { ConvexClientProvider } from "./ConvexClientProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "RiverGuard",
    template: "%s | RiverGuard",
  },
  description:
    "A local research prototype for experimental NCR flood-risk forecasting.",
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
        <FirebaseAuthProvider>
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </FirebaseAuthProvider>
      </body>
    </html>
  );
}
