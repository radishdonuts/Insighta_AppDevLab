// app/(customer)/tickets/layout.tsx
import { blockPageRole, requireAnyPageRole } from "@/lib/auth/page-guards";
import { getNavbarSessionState } from "@/lib/auth/navbar-session";
import WebsiteNavbar from "@/components/WebsiteNavbar";

export default async function CustomerGroupLayout({ children }: { children: React.ReactNode }) {
  await requireAnyPageRole(["Customer"], "/login");
  await blockPageRole(["Admin", "Staff"]);
  const session = await getNavbarSessionState();

  return (
    <>
      <WebsiteNavbar session={session} />
      {children}
    </>
  );
}
