import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaRegistrar } from "@/components/pwa/pwa-registrar";
import { ToastViewport } from "@/components/ui/toast";
import { readFlashMessage } from "@/lib/flash";

export const metadata: Metadata = {
  title: "Makerventory",
  description: "3D Printing Inventory and Operations Manager",
  manifest: "/manifest.webmanifest",
  applicationName: "Makerventory",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Makerventory",
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.png", type: "image/png", sizes: "512x512" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/favicon.svg",
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#020617",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const flash = await readFlashMessage();

  return (
    <html lang="en">
      <body>
        <PwaRegistrar />
        <ToastViewport flash={flash} />
        {children}
      </body>
    </html>
  );
}
