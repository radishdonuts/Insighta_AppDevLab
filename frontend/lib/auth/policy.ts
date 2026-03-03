import type { UserRole } from "@/types/auth";

export const ROUTE_POLICY = {
  admin: {
    allowed: ["Admin"] as const satisfies readonly UserRole[],
    redirectTo: "/admin",
  },
  staff: {
    allowed: ["Staff", "Admin"] as const satisfies readonly UserRole[],
    redirectTo: "/staff",
  },
  customer: {
    allowed: ["Customer"] as const satisfies readonly UserRole[],
    redirectTo: "/",
  },
  // Optional: pages where admin should NOT enter (like submit ticket)
  submit: {
    blocked: ["Admin", "Staff"] as const satisfies readonly UserRole[],
    redirectTo: "/admin",
  },
} as const;