import type { Metadata } from "next";
import "./globals.css";
import { ToastViewport } from "@/components/ui/toast";
import { readFlashMessage } from "@/lib/flash";

export const metadata: Metadata = {
  title: "Makerventory",
  description: "3D Printing Inventory and Operations Manager",
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const flash = await readFlashMessage();

  return (
    <html lang="en">
      <body>
        <ToastViewport flash={flash} />
        {children}
      </body>
    </html>
  );
}
