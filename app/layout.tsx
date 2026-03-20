import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Makerventory",
  description: "3D Printing Inventory and Operations Manager",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
