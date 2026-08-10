import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LenisScrollProvider } from "@/components/LenisScrollProvider";
import { ScrollToTop } from "@/components/ScrollToTop";
import { LoadingScreen } from "@/components/LoadingScreen";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "LOOMIE — Design That Connects",
  description:
    "LOOMIE is a premium design & technology studio specializing in kinetic web development, brutalist spatial concepts, and digital branding.",
  keywords: [
    "LOOMIE",
    "Branding Studio",
    "Design News",
    "Kinetic Web Development",
    "Spatial Architecture",
    "Digital Branding",
  ],
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    title: "LOOMIE — Design That Connects",
    description:
      "LOOMIE is a premium design & technology studio specializing in kinetic web development, brutalist spatial concepts, and digital branding.",
    url: "https://loomiestudio.com",
    siteName: "LOOMIE Studio",
    locale: "en_US",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('loomie-theme');if(t==='light'){document.documentElement.classList.remove('dark')}}catch(e){}})();`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(sessionStorage.getItem('loomie-loaded')==='1'||window.matchMedia('(prefers-reduced-motion: reduce)').matches){document.documentElement.setAttribute('data-loomie-loaded','1')}}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased bg-background text-foreground`}>
        <LoadingScreen />
        <ThemeProvider>
          <LenisScrollProvider>
            <ScrollToTop />
            {children}
          </LenisScrollProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
