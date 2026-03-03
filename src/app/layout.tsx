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
  const bodyClassName =
    "m-0 min-h-screen bg-background p-0 font-['Avenir_Next','Nunito_Sans','Segoe_UI',sans-serif] text-foreground";

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={bodyClassName}>
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
