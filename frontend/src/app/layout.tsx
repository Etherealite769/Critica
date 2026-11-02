import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { BUREAU_THEME_INIT_SCRIPT } from "@/lib/bureau-theme";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Critica — Forensic Reading & Deductive Reasoning Academy",
  description: "Master forensic reading comprehension and deductive reasoning. Weave crimson logic threads, repair syntactic transitions, decode context clues, and cross-examine claims across deep academic domains.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Applies the saved Dark Noir theme before hydration, so the page never flashes manila */}
        <Script
          id="bureau-theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: BUREAU_THEME_INIT_SCRIPT }}
        />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>{children}</body>
    </html>
  );
}
