import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";

import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Collaborative Docs",
  description: "A lightweight collaborative document editor",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans text-foreground">
        <TooltipProvider>
          <div className="app-shell flex min-h-full flex-1 flex-col">
            {children}
          </div>
        </TooltipProvider>
      </body>
    </html>
  );
}
