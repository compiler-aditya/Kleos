import type { Metadata } from "next";
import { Manrope, Inter } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["200", "400", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "600"],
});

export const metadata: Metadata = {
  title: "Time Machine Audio — History you don't just hear.",
  description:
    "Voice-controlled time machine that generates immersive historical audio documentaries. Talk to history.",
  openGraph: {
    title: "Time Machine Audio",
    description: "History you don't just hear. History you live.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-body">
        <div className="fixed inset-0 grain-overlay z-50" />
        {children}
      </body>
    </html>
  );
}
