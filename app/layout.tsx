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

export const metadata: Metadata = {
  title: "Pocket — conviction is collective",
  description: "Community-powered meme coin callouts with transparent rewards and integrity scoring.",
  openGraph: {
    title: "Pocket — conviction is collective",
    description: "Community-powered callouts. Transparent rewards.",
    images: [{ url: "/og.png", width: 1680, height: 945, alt: "Pocket — conviction is collective" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pocket — conviction is collective",
    description: "Community-powered callouts. Transparent rewards.",
    images: ["/og.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
