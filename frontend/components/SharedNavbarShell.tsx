"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { logoutAction } from "@/app/auth/actions";
import type { UserRole } from "@/types/auth";
import type { NavbarSessionState } from "./AppNavbar";

type SharedNavbarShellProps = {
  session: NavbarSessionState;
  children: React.ReactNode; // role-specific tabs go here
};

function getRoleBadge(role: UserRole | null): "Staff" | "Admin" | null {
  if (role === "Staff" || role === "Admin") return role;
  return null;
}

export default function SharedNavbarShell({
  session,
  children,
}: SharedNavbarShellProps) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const roleBadge =
    session.status === "authenticated" ? getRoleBadge(session.role) : null;

  return (
    <nav className={`navbar ${isScrolled ? "navbar-scrolled" : ""}`}>
      <Link href="/" className="navbar-brand">
        <Image
          src="/assets/images/blue_logo.png"
          alt="Insighta logo"
          width={70}
          height={70}
          priority
        />
        Insighta
      </Link>

      <div className="navbar-links">
        {/* Role/route-specific tabs */}
        {children}

        {/* Shared auth block (always reused) */}
        {session.status === "authenticated" ? (
          <>
            <div className="auth-indicator auth-indicator-signed" aria-live="polite">

              <span className="auth-user-label" title={session.accountLabel}>
                {session.accountLabel}
              </span>

              {roleBadge ? (
                <span className={`auth-role-badge auth-role-${roleBadge.toLowerCase()}`}>
                  {roleBadge}
                </span>
              ) : null}
            </div>

            <form action={logoutAction} className="nav-inline-form">
              <button type="submit" className="nav-btn nav-btn-secondary">
                Log out
              </button>
            </form>
          </>
        ) : (
          <>
            <Link href="/login" className="nav-link">
              Login
            </Link>
            <Link href="/register" className="nav-btn">
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}