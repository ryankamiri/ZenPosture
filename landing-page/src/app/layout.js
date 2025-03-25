import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ClientLayout from "./ClientLayout";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Zen Posture | AI-Powered Posture Correction",
  description: "Award-winning application from HackNYU 2025 that uses AI to analyze and improve your sitting posture, reducing pain and increasing productivity.",
  keywords: ["posture", "AI", "health", "wellness", "productivity", "HackNYU"],
  authors: [{ name: "Zen Posture Team" }],
  openGraph: {
    title: "Zen Posture | AI-Powered Posture Correction",
    description: "Award-winning application from HackNYU 2025 that helps improve your posture.",
    url: "https://zenposture.app",
    siteName: "Zen Posture",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Zen Posture - Your Personal Posture Coach"
      }
    ],
    type: "website"
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
