import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { DemoBanner } from "@/app/components/DemoBanner";
import { NavBalk } from "@/app/components/NavBalk";
import "./globals.css";

// Zet de .dark class vóór hydratie, anders flitst de pagina eerst in het
// verkeerde thema (lichte flash bij een donker-thema-voorkeur, of andersom).
const THEMA_INIT_SCRIPT = `
(function () {
  try {
    var thema = localStorage.getItem("thema");
    var donker = thema === "donker" || (thema !== "licht" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", donker);
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

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_DEMO ? "Finance Platform (demo)" : "Finance Platform",
  description: "Rapportage over persoonlijke financiën",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="nl"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <Script id="thema-init" strategy="beforeInteractive">
          {THEMA_INIT_SCRIPT}
        </Script>
      </head>
      <body className="min-h-full flex flex-col">
        <DemoBanner />
        <NavBalk />
        {children}
      </body>
    </html>
  );
}
