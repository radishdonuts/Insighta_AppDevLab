import { redirect } from "next/navigation";
import type { UserRole } from "@/types/auth";
import { hasAnyRole } from "./roles";
import { getServerAuthRoleContext } from "./server"; 

type Ctx = Awaited<ReturnType<typeof getServerAuthRoleContext>>;

function roleHome(role: UserRole | null) {
  if (role === "Admin") return "/admin";
  if (role === "Staff") return "/staff";
  if (role === "Customer") return "/my_tickets";
  return "/unauthorized";
}

export async function requireAnyPageRole(
  allowedRoles: readonly UserRole[],
  redirectTo = "/unauthorized"
) {
  const ctx: Ctx = await getServerAuthRoleContext();

  if (ctx.status === "unauthenticated") redirect("/login");

  if (ctx.status === "forbidden") {
    // optional: you can route based on reason if you want
    // e.g. inactive_profile -> "/inactive"
    redirect("/unauthorized");
  }

  // ✅ Now ctx is authorized
  const role = ctx.auth.role;

  if (!hasAnyRole(role, allowedRoles)) redirect(redirectTo);

  return ctx;
}

export async function blockPageRole(
  blockedRoles: readonly UserRole[],
  redirectTo = "/"
) {
  const ctx: Ctx = await getServerAuthRoleContext();

  // allow guests/unauth unless you want to block them too
  if (ctx.status !== "authorized") return ctx;

  if (hasAnyRole(ctx.auth.role, blockedRoles)) redirect(redirectTo);

  return ctx;
}

export async function blockAuthenticatedUsers() {
  const ctx = await getServerAuthRoleContext();

  if (ctx.status === "authorized") redirect(roleHome(ctx.auth.role));
  if (ctx.status === "forbidden") redirect("/unauthorized");

  return ctx; // unauthenticated allowed
}
