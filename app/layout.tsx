import {LanguageInitializer} from "@/lib/i18n/react";
import type { Metadata } from "next";
import "./globals.css";
import "leaflet/dist/leaflet.css";

export const metadata: Metadata = {
  title: "Hadhri Delivery — Restaurants et livraison",
  description: "Choisissez vos restaurants et boutiques, puis commandez avec paiement à la livraison.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/images/hadhri-logo-transparent.png",
    shortcut: "/images/hadhri-logo-transparent.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" dir="ltr" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{localStorage.setItem('hadhri-language','fr');document.documentElement.lang='fr';document.documentElement.dir='ltr';}catch(e){}})();`,
          }}
        />
      </head>
      <body className="antialiased"><LanguageInitializer/>{children}</body>
    </html>
  );
}
