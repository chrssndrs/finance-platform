import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NavBalk } from "@/app/components/NavBalk";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Finance Platform",
  description: "Rapportage over persoonlijke financiën",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="nl"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NavBalk />
        {children}
      </body>
    </html>
  );
}
