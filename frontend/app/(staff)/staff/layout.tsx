// app/(staff)/staff/layout.tsx
import { requireAnyPageRole } from "@/lib/auth/page-guards";
import { getNavbarSessionState } from "@/lib/auth/navbar-session";
import StaffNavbar from "@/components/StaffNavbar";

export default async function StaffGroupLayout({ children }: { children: React.ReactNode }) {
  await requireAnyPageRole(["Staff"], "/unauthorized");
  const session = await getNavbarSessionState();

  return (
    <div className="staff-route-shell">
      <StaffNavbar session={session} />
      {children}
    </div>
  );
}
