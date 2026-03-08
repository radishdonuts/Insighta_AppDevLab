// app/layout.tsx
import "@/components/styles/globals.css";
import { sora, jakarta } from "@/lib/fonts";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${sora.variable} ${jakarta.variable}`}>{children}</body>
    </html>
  );
}
