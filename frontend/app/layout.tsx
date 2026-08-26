import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { DemoBanner } from "@/app/components/DemoBanner";
import { NavBalk } from "@/app/components/NavBalk";
import { OudeDataBanner } from "@/app/components/OudeDataBanner";
import "./globals.css";

// Zet de .dark class vóór hydratie, anders flitst de pagina eerst in het
// verkeerde thema (lichte flash bij een donker-thema-voorkeur, of andersom).
const THEMA_INIT_SCRIPT = `
(function () {
  try {
    var thema = localStorage.getItem("thema");
    var donker = thema === "donker" || (thema !== "licht" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", donker);
    var chartThema = localStorage.getItem("chart-thema");
    if (chartThema === "warm" || chartThema === "koel") {
      document.documentElement.classList.add("chart-thema-" + chartThema);
    }
  } catch (e) {}
})();
`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Gebruikt alleen voor het "Libreo"-wordmark in de navbar — een lettertype
// met karakter maakt het merk herkenbaar naast de neutrale Geist-UI-tekst.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["600"],
  style: ["italic"],
});

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_DEMO ? "Libreo (demo)" : "Libreo",
  description: "Rapportage over persoonlijke financiën",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="nl"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <Script id="thema-init" strategy="beforeInteractive">
          {THEMA_INIT_SCRIPT}
        </Script>
      </head>
      <body className="min-h-full flex flex-col">
        <DemoBanner />
        <OudeDataBanner />
        <NavBalk>{children}</NavBalk>
      </body>
    </html>
  );
}
