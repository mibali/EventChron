import type { Metadata } from "next";
import "./globals.css";
import Footer from "@/components/Footer";
import { SessionProvider } from "@/components/SessionProvider";

export const metadata: Metadata = {
  title: "EventChron - SaaS Platform",
  description: "Professional event timer for church services, conferences, and meetups",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased flex flex-col min-h-screen">
        <SessionProvider>
        <main className="flex-1 overflow-auto">
          {children}
        </main>
        <Footer />
        </SessionProvider>
      </body>
    </html>
  );
}


