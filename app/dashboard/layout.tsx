import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

import { keystoneClient } from "@/features/dashboard/lib/keystoneClient";

async function storeName() {
  const r = await keystoneClient<{ storeLogo: { name: string } }>("{ storeLogo { name } }");
  return (r.success && r.data.storeLogo?.name) || "Concerts";
}

export async function generateMetadata(): Promise<Metadata> {
  const name = await storeName();
  return { title: `${name} staff`, description: `Staff dashboard for ${name}.` };
}

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
      <Toaster />
    </ThemeProvider>
  );
}
