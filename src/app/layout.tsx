import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { ForcePasswordRedirect } from "@/components/auth/force-password-redirect";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryProvider } from "@/components/query-provider";
import { Toaster } from "sonner";
import { CurrentUserProvider } from "@/contexts/current-user-context";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sahi Company — Internal Job Management & CRM",
  description: "Enterprise-grade task and personnel management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${inter.className} font-sans min-h-screen bg-background text-foreground antialiased`}>
        <ThemeProvider
          attribute="data-theme"
          defaultTheme="signature"
          enableSystem={false}
          themes={["light", "dark", "signature"]}
          disableTransitionOnChange
        >
          <QueryProvider>
            <CurrentUserProvider>
            <ForcePasswordRedirect />
            <AppShell>
              {children}
            </AppShell>
            <Toaster position="top-right" richColors closeButton />
            </CurrentUserProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
