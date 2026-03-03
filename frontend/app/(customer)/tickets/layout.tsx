// app/(customer)/layout.tsx
import { requireAnyPageRole } from "@/lib/auth/page-guards";

export default async function CustomerGroupLayout({ children }: { children: React.ReactNode }) {
  await requireAnyPageRole(["Customer"], "/login");
  return <>{children}</>;
}