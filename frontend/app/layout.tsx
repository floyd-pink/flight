import type { Metadata } from "next";
import Link from "next/link";
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
  title: "Flight Search",
  description: "Search arrivals and departures ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-100 text-slate-900">
        <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
            <Link href="/" className="text-lg font-semibold tracking-tight text-slate-900">
              Flight Tracker
            </Link>
            <nav className="flex items-center gap-4 text-sm font-medium text-slate-600">
              <Link className="hover:text-blue-700" href="/live-states">
                Live States
              </Link>
              <Link className="hover:text-blue-700" href="/track-aircraft">
                Track Aircraft
              </Link>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
