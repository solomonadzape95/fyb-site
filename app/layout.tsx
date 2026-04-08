import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FYB '26 — Final Year Brethren",
  description: "Submit your FYB personality profile for the Class of 2026.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full antialiased">
        {children}
      </body>
    </html>
  );
}
