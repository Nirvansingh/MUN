import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MUN Research Hub",
  description: "Comprehensive research library for Model United Nations delegates",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
