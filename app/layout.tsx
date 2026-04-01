import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mauniele Atelier",
  description: "Exklusiva parfymoljor med en lyxigare shoppingupplevelse och snabb Stripe-kassa.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv">
      <body>{children}</body>
    </html>
  );
}
