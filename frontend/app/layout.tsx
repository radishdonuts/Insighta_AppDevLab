// app/layout.tsx
import type { Metadata } from "next";

import "@/components/styles/globals.css";
import { sora, jakarta } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "Insighta",
  description: "AI-Powered Complaint Resolution for Insurance",
  icons: {
    icon: "/assets/images/blue_logo.png",
    shortcut: "/assets/images/blue_logo.png",
    apple: "/assets/images/blue_logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${sora.variable} ${jakarta.variable}`}>{children}</body>
    </html>
  );
}
