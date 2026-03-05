// lib/auth/navbar-session.ts
import { getServerAuthRoleContext } from "@/lib/auth/server";
import type { NavbarSessionState } from "@/components/AppNavbar";

export async function getNavbarSessionState(): Promise<NavbarSessionState> {
  try {
    const result = await getServerAuthRoleContext();

    if (result.status === "unauthenticated") {
      return { status: "anonymous" };
    }

    const user = result.status === "authorized" ? result.auth.user : result.user;
    const accountLabel =
      typeof user.email === "string" && user.email.trim().length > 0
        ? user.email.trim()
        : `user:${user.id.slice(0, 8)}`;

    return {
      status: "authenticated",
      accountLabel,
      role: result.status === "authorized" ? result.auth.role : null,
    };
  } catch (error) {
    console.error("Navbar auth lookup failed:", error);
    return { status: "anonymous" };
  }
}
