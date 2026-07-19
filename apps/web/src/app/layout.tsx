import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "BackTest Pro — бэктест Binance Futures",
  description: "Бэктест стратегий на отскоках. 3 дня бесплатно. Тарифы Basic и Pro.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body
        className={`${inter.className} min-h-screen bg-surface text-gray-100 antialiased font-sans`}
      >
        {children}
      </body>
    </html>
  );
}
