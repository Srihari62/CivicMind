/**
 * @file src/app/layout.tsx
 * @description Root layout component for CivicMind platform.
 * Defines the main HTML shell, imports global CSS styles, loads premium font variables,
 * and sets baseline SEO metadata.
 */

import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@/styles/globals.css";
import { QueryProvider } from "@/providers/query-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { AuthProvider } from "@/providers/auth-provider";

// Load Geist Sans Font (modern clean typography)
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Load Geist Mono Font (for code/tabular/data views)
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * Root metadata settings for SEO best practices.
 */
export const metadata: Metadata = {
  title: "CivicMind | AI-Powered Civic Platform",
  description: "Empowering communities through smart, AI-driven public reporting, real-time collaboration, and automated ticketing.",
  keywords: ["civic technology", "AI government", "community reporting", "smart city", "incident dispatch", "CivicMind"],
  authors: [{ name: "CivicMind Team" }],
  icons: {
    icon: "/favicon.ico",
  },
};

/**
 * Viewport settings for responsiveness and mobile scaling.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background text-foreground`}
      >
        <QueryProvider>
          <ThemeProvider defaultTheme="system" storageKey="civicmind-theme">
            <AuthProvider>
              {children}
            </AuthProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
