// app/(guest)/layout.tsx
import { blockPageRole } from "@/lib/auth/page-guards";

export default async function GuestGroupLayout({ children }: { children: React.ReactNode }) {
  await blockPageRole(["Admin", "Staff"]);
  return <>{children}</>;
}