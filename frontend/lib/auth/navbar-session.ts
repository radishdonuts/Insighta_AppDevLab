// lib/auth/navbar-session.ts
import { getServerAuthRoleContext } from "@/lib/auth/server";
import type { NavbarSessionState } from "@/components/AppNavbar";

function buildAccountLabel(
  firstName: string | null,
  lastName: string | null,
  email: string | undefined,
  userId: string
): string {
  // Prefer full name if available
  const firstPart = firstName?.trim() || "";
  const lastPart = lastName?.trim() || "";
  
  if (firstPart && lastPart) {
    return `${firstPart} ${lastPart}`;
  }
  if (firstPart) {
    return firstPart;
  }
  if (lastPart) {
    return lastPart;
  }
  
  // Fallback to email
  if (typeof email === "string" && email.trim().length > 0) {
    return email.trim();
  }
  
  // Final fallback to user ID
  return `user:${userId.slice(0, 8)}`;
}

export async function getNavbarSessionState(): Promise<NavbarSessionState> {
  try {
    const result = await getServerAuthRoleContext();

    if (result.status === "unauthenticated") {
      return { status: "anonymous" };
    }

    const user = result.status === "authorized" ? result.auth.user : result.user;
    const firstName = result.status === "authorized" ? result.auth.firstName : null;
    const lastName = result.status === "authorized" ? result.auth.lastName : null;

    const accountLabel = buildAccountLabel(firstName, lastName, user.email, user.id);

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
