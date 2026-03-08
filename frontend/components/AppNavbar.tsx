"use client";

import type { UserRole } from "@/types/auth";
import WebsiteNavbar from "./WebsiteNavbar";
import AdminNavbar from "./AdminNavbar";
import StaffNavbar from "./StaffNavbar";

export type NavbarSessionState =
  | { status: "anonymous" }
  | { status: "authenticated"; accountLabel: string; role: UserRole | null };

type AppNavbarProps = {
  session: NavbarSessionState;
};

export default function AppNavbar({ session }: AppNavbarProps) {
  if (session.status === "authenticated" && session.role === "Admin") {
    return <AdminNavbar session={session} />;
  }

  if (session.status === "authenticated" && session.role === "Staff") {
    return <StaffNavbar session={session} />;
  }

  // Guests + Customers use website-facing nav
  return <WebsiteNavbar session={session} />;
}

