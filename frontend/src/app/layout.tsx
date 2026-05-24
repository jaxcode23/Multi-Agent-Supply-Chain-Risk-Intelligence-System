import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Risk Intel System",
  description: "Operational Intelligence for Global Supply Chains",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
