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
    "m-0 min-h-screen bg-[radial-gradient(circle_at_10%_12%,var(--ambient-a)_0%,transparent_30%),radial-gradient(circle_at_90%_8%,var(--ambient-b)_0%,transparent_32%),linear-gradient(180deg,var(--bg-start)_0%,var(--bg-mid)_55%,var(--bg-end)_100%)] p-0 font-['Avenir_Next','Nunito_Sans','Segoe_UI',sans-serif] text-[var(--text)]";

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
