import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "MUN Research Hub",
    template: "%s | MUN Research Hub",
  },
  description: "Comprehensive research library for Model United Nations delegates",
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#111318" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
};

// Applies the persisted theme before first paint to avoid a flash of the
// wrong theme when a returning user has chosen light mode.
const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem('mun_theme');if(t){var v=JSON.parse(t);if(v==='light'){document.documentElement.setAttribute('data-theme','light')}}}catch(e){}`;

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
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
