"use client";

import Link from "next/link";
import type { NavbarSessionState } from "./AppNavbar";
import SharedNavbarShell from "./SharedNavbarShell";

type WebsiteNavbarProps = {
  session: NavbarSessionState;
};

export default function WebsiteNavbar({ session }: WebsiteNavbarProps) {
  const isCustomer =
    session.status === "authenticated" && session.role === "Customer";

  return (
    <SharedNavbarShell session={session}>
      <Link href="/" className="nav-link">
        Home
      </Link>

      <Link href="/about" className="nav-link">
        About
      </Link>

      {!isCustomer ? (
        <>
          <Link href="/submit" className="nav-link">
            Submit a Ticket
          </Link>
          <Link href="/track" className="nav-link">
            Track Ticket
          </Link>
          <Link href="/feedback" className="nav-link">
            Feedback
          </Link>
        </>
      ) : (
        <>
          <Link href="/my_tickets" className="nav-link">
            My Tickets
          </Link>
          <Link href="/submit" className="nav-link">
            Submit a Ticket
          </Link>
          <Link href="/track" className="nav-link">
            Track Ticket
          </Link>
          <Link href="/feedback" className="nav-link">
            Feedback
          </Link>
        </>
      )}
    </SharedNavbarShell>
  );
}
