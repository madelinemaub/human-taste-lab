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

export const metadata = {
  title: "Human Taste Lab",
  description: "Can AI predict your aesthetic taste? Pick your favorite photo in 3 rounds and find out.",
  openGraph: {
    title: "Human Taste Lab",
    description: "Can AI predict your aesthetic taste? Pick your favorite photo in 3 rounds and find out.",
    url: "https://humantastelab.com",
    siteName: "Human Taste Lab",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Human Taste Lab",
    description: "Can AI predict your aesthetic taste? Pick your favorite photo in 3 rounds and find out.",
  },
};

export default function RootLayout({ children }) {
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
