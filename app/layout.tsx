import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import { GeistPixelSquare } from "geist/font/pixel";
import { Providers } from "@/components/providers/providers";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SlideBoard - Editable Whiteboard Decks",
  description: "Build, edit, and present interactive whiteboard slides with a local-first SlideBoard workflow.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${GeistPixelSquare.className} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
