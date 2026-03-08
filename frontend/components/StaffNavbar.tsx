"use client";

import Link from "next/link";
import type { NavbarSessionState } from "./AppNavbar";
import SharedNavbarShell from "./SharedNavbarShell";

type StaffNavbarProps = {
  session: NavbarSessionState;
};

export default function StaffNavbar({ session }: StaffNavbarProps) {
  return (
    <SharedNavbarShell session={session}>
      <Link href="/staff" className="nav-link">
        Home
      </Link>
      <Link href="/staff/work-tickets" className="nav-link">
        My Tickets
      </Link>
    </SharedNavbarShell>
  );
}
