import type { Metadata } from "next";

import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";

import "./globals.css";

export const metadata: Metadata = {
  title: "Manga Reader",
  description: "One Piece manga reader with chapter list and PDF viewer.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ThemeToggle />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
