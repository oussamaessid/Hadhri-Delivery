import { LanguageInitializer } from "@/lib/i18n/react";
import type { Metadata, Viewport } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-hadhri-sans",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  style: ["normal", "italic"],
  variable: "--font-hadhri-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Hadhri Delivery — Restaurants et livraison à Monastir",
  description:
    "Restaurants, poissons frais, fruits et légumes, poulet fermier et fruits secs — commandez en quelques clics, payez en espèces à la livraison.",
  icons: {
    icon: "/images/hadhri-logo-transparent.png",
    shortcut: "/images/hadhri-logo-transparent.png",
    apple: "/images/hadhri-logo-transparent.png",
  },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Hadhri" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fffbf2" },
    { media: "(prefers-color-scheme: dark)", color: "#17100a" },
  ],
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
        <style
          dangerouslySetInnerHTML={{
            __html: `:root{--font-sans:${jakarta.style.fontFamily},system-ui,sans-serif;--font-display:${fraunces.style.fontFamily},Georgia,serif}`,
          }}
        />
      </head>
      <body
        className={`antialiased ${jakarta.variable} ${fraunces.variable}`}
      >
        <LanguageInitializer />
        {children}
      </body>
    </html>
  );
}
