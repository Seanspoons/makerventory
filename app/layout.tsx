import type { Metadata } from "next";
import "./globals.css";
import { ToastViewport } from "@/components/ui/toast";
import { readFlashMessage } from "@/lib/flash";

export const metadata: Metadata = {
  title: "Makerventory",
  description: "3D Printing Inventory and Operations Manager",
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
