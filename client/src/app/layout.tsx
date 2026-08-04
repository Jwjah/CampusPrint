import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";
import dynamic from "next/dynamic";
import { Inter } from "next/font/google";

// Lazy-load non-critical UI: InstallPrompt defers loading of install prompt logic
const InstallPrompt = dynamic(() => import("@/components/InstallPrompt"));

// Self-hosted font via next/font — eliminates render-blocking Google Fonts CSS
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#050510",
};

export const metadata: Metadata = {
  title: "CampusPrint — Campus Printing Made Easy",
  description: "Upload, print, and deliver documents across campus. Students, shops, and agents — all connected in one premium platform.",
  keywords: "campus, print, university, documents, delivery",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CampusPrint",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "application-name": "CampusPrint",
    "apple-mobile-web-app-title": "CampusPrint",
    "msapplication-TileColor": "#050510",
    "msapplication-TileImage": "/icons/icon-144x144.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-32x32.png" />
        {/* DNS prefetch for external services to reduce connection latency */}
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
        <link rel="preconnect" href="https://res.cloudinary.com" crossOrigin="anonymous" />
      </head>
      <body className={inter.className}>
        <ServiceWorkerRegistrar />
        <InstallPrompt />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#151530',
              color: '#f1f5f9',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              fontSize: '14px',
              fontFamily: 'var(--font-inter), Inter, sans-serif',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            },
            success: {
              iconTheme: { primary: '#22c55e', secondary: '#fff' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#fff' },
            },
          }}
        />
        {children}
      </body>
    </html>
  );
}

