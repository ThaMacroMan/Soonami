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
  title: "Mnemos - A Cardano Beginners Guide",
  description: "Creating beginner friendly tools and guides for the latest AI Tools to mint the next generation of Cardano Developers. Learn to build on Cardano with AI assistance.",
  keywords: "Cardano, blockchain, AI tools, developer guide, beginners, Web3, Cursor, ChatGPT",
  authors: [{ name: "Mnemos Team" }],
  openGraph: {
    title: "Mnemos - A Cardano Beginners Guide",
    description: "Creating beginner friendly tools and guides for the latest AI Tools to mint the next generation of Cardano Developers.",
    type: "website",
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
