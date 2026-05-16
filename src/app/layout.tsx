import type { Metadata } from "next";
import Script from "next/script";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { BusinessProvider } from "@/contexts/BusinessContext";
import { SessionProvider } from "@/components/session-provider";
import "./globals.css";

const GA_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;

export const metadata: Metadata = {
  title: "MobileHub Delhi - CRM Dashboard",
  description: "CRM and business management dashboard for MobileHub Delhi.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="gtag-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}', { page_path: window.location.pathname });
              `}
            </Script>
          </>
        )}
      </head>
      <body className="antialiased">
        <SessionProvider>
          <ThemeProvider>
            <BusinessProvider>
              {children}
              <Toaster position="top-right" />
            </BusinessProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
