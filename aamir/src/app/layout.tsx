import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { cormorant, montserrat } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "AAMIR — Gioielleria artigianale a Salerno",
  description:
    "Gioielli artigianali lavorati a mano da Aamir a Salerno. Collane, anelli, bracciali e orecchini in pietre preziose.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();

  return (
    <html lang={locale} className={`${cormorant.variable} ${montserrat.variable}`}>
      <body>{children}</body>
    </html>
  );
}
