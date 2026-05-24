import type { Metadata } from "next";
import { AppNavbar } from "@/app/components/app-navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "kabSUBO | CvSU Food Discovery",
  description:
    "A map-centered food discovery draft for CvSU Indang students.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <AppNavbar />
        {children}
      </body>
    </html>
  );
}
