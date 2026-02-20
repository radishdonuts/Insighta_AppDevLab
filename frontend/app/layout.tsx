import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Insighta",
  description: "AI-Powered Complaint Resolution for Insurance"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Navbar */}
        <nav className="navbar">
          <Link href="/" className="navbar-brand">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Insighta
          </Link>
          <div className="navbar-links">
            <Link href="/about" className="nav-link">About</Link>
            <Link href="/login" className="nav-link">Login</Link>
            <Link href="/register" className="nav-btn">Register</Link>
          </div>
        </nav>

        {children}
      </body>
    </html>
  );
}
