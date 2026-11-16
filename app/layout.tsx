import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { keystoneClient } from "@/features/dashboard/lib/keystoneClient";

async function storeName() {
  const r = await keystoneClient<{ storeLogo: { name: string } }>("{ storeLogo { name } }");
  return (r.success && r.data.storeLogo?.name) || "Concerts";
}

export async function generateMetadata(): Promise<Metadata> {
  const name = await storeName();
  return { title: name, description: `Tickets for live shows at ${name}.` };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link href="/favicon.svg" rel="icon" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
