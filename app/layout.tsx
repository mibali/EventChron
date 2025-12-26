import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Event Timer - SaaS Platform",
  description: "Professional event timer for church services, conferences, and meetups",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}


