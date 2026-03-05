// app/(admin)/admin/layout.tsx
import { requireAnyPageRole } from "@/lib/auth/page-guards";
import { getNavbarSessionState } from "@/lib/auth/navbar-session";
import AdminNavbar from "@/components/AdminNavbar";

export default async function AdminGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAnyPageRole(["Admin"], "/unauthorized");
  const session = await getNavbarSessionState();

  return (
    <>
      <AdminNavbar session={session} />
      {children}
    </>
  );
}