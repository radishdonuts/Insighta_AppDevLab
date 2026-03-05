"use client";

import Link from "next/link";
import type { NavbarSessionState } from "./AppNavbar";
import SharedNavbarShell from "./SharedNavbarShell";

type AdminNavbarProps = {
  session: NavbarSessionState;
};

export default function AdminNavbar({ session }: AdminNavbarProps) {
  return (
    <SharedNavbarShell session={session}>
      <Link href="/admin" className="nav-link">
        Home
      </Link>
      <Link href="/admin/overview" className="nav-link">
        Overview
      </Link>
      <Link href="/admin/statistics" className="nav-link">
        Statistics
      </Link>
      <Link href="/admin/categories" className="nav-link">
        Categories
      </Link>
      <Link href="/admin/activity" className="nav-link">
        Activity
      </Link>
    </SharedNavbarShell>
  );
}