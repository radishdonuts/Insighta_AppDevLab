// app/(staff)/layout.tsx
import { requireAnyPageRole } from "@/lib/auth/page-guards";

export default async function StaffGroupLayout({ children }: { children: React.ReactNode }) {
  await requireAnyPageRole(["Staff", "Admin"], "/unauthorized");
  return <>{children}</>;
}