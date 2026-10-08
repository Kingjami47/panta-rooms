import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/Providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Canonical production origin — keeps OG/canonical URLs stable regardless
  // of deployment URL. MUST be a live, DNS-resolving domain: social crawlers
  // (X/LinkedIn/Discord) fetch og:image relative to this base. Verified live:
  // panta-rooms.vercel.app. (panterrooms.xyz does NOT resolve — do not use.)
  // Overridable via NEXT_PUBLIC_APP_URL when a custom domain is wired.
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://panta-rooms.vercel.app"),
  title: "Panta Rooms — Every question can become a market",
  description:
    "A social layer for prediction markets. Create prediction Rooms, bring your community into the conversation, and let people trade directly on the outcomes — powered by the Panta API on Solana.",
  keywords: ["Panta Rooms", "prediction markets", "Panta API", "Solana", "social trading", "communities"],
  authors: [{ name: "Panta Rooms" }],
  openGraph: {
    title: "Panta Rooms — Every question can become a market",
    description: "A social layer for prediction markets, powered by Panta.",
    siteName: "Panta Rooms",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Panta Rooms — PR monogram" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Panta Rooms — Every question can become a market",
    description: "A social layer for prediction markets, powered by Panta.",
    images: ["/og.png"],
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
        {/*
          Console hygiene: wallet browser extensions (Phantom, MetaMask, ...)
          log their own injection errors — e.g. Phantom's evmPhantom.js logs
          "Error redefining provider into window.ethereum" when another EVM
          wallet extension is installed. Those errors originate entirely inside
          chrome-extension:// content scripts and are not app faults, but the
          Next.js dev overlay surfaces every console.error, which makes the
          app look broken.

          Two-layer filter:
          1. INNER (immediately): wraps the native console.error so the real
             browser console stays clean.
          2. OUTER (DOMContentLoaded / load / deferred re-checks): Next's dev
             runtime patches console.error during its synchronous bootstrap
             (app-globals → patchConsoleError) and feeds every call to the
             overlay before any earlier wrapper runs. Re-wrapping AFTER Next's
             patch makes this filter outermost, so extension noise is dropped
             before the overlay ever records it. App errors still pass through
             to both the overlay and the console.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(window.__prConsoleHygiene)return;window.__prConsoleHygiene=true;function isExtensionNoise(args){var msg=typeof args[0]==="string"?args[0]:"";if(msg.indexOf("redefining provider into window.ethereum")!==-1)return true;var hay=msg;for(var i=1;i<args.length;i++){var a=args[i];try{if(a instanceof Error&&a.stack)hay+="\\n"+a.stack;}catch(e){}}var callerStack="";try{callerStack=new Error().stack||"";}catch(e){}var combined=hay+"\\n"+callerStack;return combined.indexOf("chrome-extension://")!==-1;}var nativeError=console.error.bind(console);if(!console.error.__prInner){var inner=function(){try{if(isExtensionNoise(Array.prototype.slice.call(arguments)))return;}catch(e){}return nativeError.apply(console,arguments);};inner.__prInner=true;console.error=inner;}function installOuter(){try{var cur=console.error;if(cur&&cur.__prOuter)return;var outer=function(){try{if(isExtensionNoise(Array.prototype.slice.call(arguments)))return;}catch(e){}return cur.apply(console,arguments);};outer.__prOuter=true;console.error=outer;}catch(e){}}if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",installOuter);}else{installOuter();}window.addEventListener("load",installOuter);[200,1000,3000,10000].forEach(function(t){setTimeout(installOuter,t);});}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}>
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
