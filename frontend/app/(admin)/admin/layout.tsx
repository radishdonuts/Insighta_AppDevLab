// app/(admin)/layout.tsx
// app/(admin)/layout.tsx
import { requireAnyPageRole } from "@/lib/auth/page-guards";
import AdminNav from "./AdminNav"; // adjust if your nav is elsewhere

export default async function AdminGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAnyPageRole(["Admin"], "/unauthorized");

  return (
      <>
      <AdminNav />
      <>{children}</>
      </>
  );
}