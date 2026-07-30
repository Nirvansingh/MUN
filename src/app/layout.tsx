import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MUN Research Hub",
  description: "Comprehensive research library for Model United Nations delegates",
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/favicon.png" />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
