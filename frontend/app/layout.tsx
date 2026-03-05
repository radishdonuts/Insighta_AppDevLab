// app/layout.tsx
import "@/app/(public)/globals.css";
import { sora, jakarta } from "@/app/fonts";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${sora.variable} ${jakarta.variable}`}>{children}</body>
    </html>
  );
}
