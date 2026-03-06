"use client";

import { useEffect, useRef, useState } from "react";
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
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const roleBadge =
    session.status === "authenticated" ? getRoleBadge(session.role) : null;
  const canOpenAccountMenu =
    session.status === "authenticated" &&
    (session.role === "Customer" || session.role === "Staff");
  const changePasswordHref =
    session.status !== "authenticated"
      ? null
      : session.role === "Customer"
      ? "/account/change-password"
      : session.role === "Staff"
      ? "/staff/account/change-password"
      : null;

  useEffect(() => {
    if (!isAccountMenuOpen) return;

    const onClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (!target) return;
      if (accountMenuRef.current?.contains(target as Node)) return;
      setIsAccountMenuOpen(false);
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsAccountMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("touchstart", onClickOutside);
    document.addEventListener("keydown", onEscape);

    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("touchstart", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [isAccountMenuOpen]);

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
            {canOpenAccountMenu && changePasswordHref ? (
              <div ref={accountMenuRef} className="account-menu-shell">
                <button
                  type="button"
                  className="auth-indicator auth-indicator-signed auth-indicator-trigger"
                  aria-haspopup="menu"
                  aria-expanded={isAccountMenuOpen}
                  onClick={() => setIsAccountMenuOpen((current) => !current)}
                >
                  <span className="auth-user-label" title={session.accountLabel}>
                    {session.accountLabel}
                  </span>

                  {roleBadge ? (
                    <span className={`auth-role-badge auth-role-${roleBadge.toLowerCase()}`}>
                      {roleBadge}
                    </span>
                  ) : null}

                  <svg
                    className={`auth-menu-caret ${isAccountMenuOpen ? "is-open" : ""}`}
                    viewBox="0 0 20 20"
                    fill="none"
                    aria-hidden
                  >
                    <path
                      d="M5 7.5L10 12.5L15 7.5"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                <div className={`auth-dropdown ${isAccountMenuOpen ? "auth-dropdown-open" : ""}`} role="menu">
                  <Link
                    href={changePasswordHref}
                    role="menuitem"
                    className="auth-dropdown-link"
                    onClick={() => setIsAccountMenuOpen(false)}
                  >
                    Change Password
                  </Link>

                  <form action={logoutAction} className="auth-dropdown-form">
                    <button
                      type="submit"
                      role="menuitem"
                      className="auth-dropdown-button auth-dropdown-danger"
                      onClick={() => setIsAccountMenuOpen(false)}
                    >
                      Log out
                    </button>
                  </form>
                </div>
              </div>
            ) : (
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
            )}
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
