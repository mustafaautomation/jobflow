import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces" });

export const metadata: Metadata = {
  title: { default: "Jobflow", template: "%s · Jobflow" },
  description: "Dispatch, field notes, and invoices for HVAC shops. Cedar HVAC is the live demo.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html className={`${outfit.variable} ${fraunces.variable} h-full antialiased`} lang="en">
      <body className="min-h-dvh bg-background text-foreground">
        <TooltipProvider>
          {children}
          <Toaster />
        </TooltipProvider>
      </body>
    </html>
  );
}
