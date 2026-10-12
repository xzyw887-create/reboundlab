import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { LocaleProvider } from "@/lib/i18n";
import { trialCopy } from "@/lib/productPolicy";
import "./globals.css";

const metaTrial = trialCopy("en");

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "BackTest Pro — Crypto Futures Backtesting",
  description: metaTrial.metaDescriptionTrial,
  icons: {
    icon: "/brand/logo.png",
    apple: "/brand/logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body
        className={`${inter.className} min-h-screen bg-surface text-gray-100 antialiased font-sans overflow-x-clip overscroll-x-none`}
      >
        <div className="min-h-screen overflow-x-clip overscroll-x-none">
          <LocaleProvider>{children}</LocaleProvider>
        </div>
      </body>
    </html>
  );
}
