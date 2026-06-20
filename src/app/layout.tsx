import type { Metadata } from "next";

import "@/app/globals.css";

export const metadata: Metadata = {
  title: {
    default: "Terumbu.eco",
    template: "%s | Terumbu.eco"
  },
  description:
    "Conservation funding, expeditions, academy learning, and verified impact tracking for Indonesia's coastal ecosystems."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

