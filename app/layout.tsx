import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import { Navigation } from "./components/Navigation";
import { ThemeProvider } from "./components/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: "Finance Tracker",
  description: "Track your spending with Wise",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <Navigation />
          {children}
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
