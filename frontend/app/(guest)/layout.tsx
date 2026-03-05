// app/(guest)/layout.tsx
import { blockPageRole } from "@/lib/auth/page-guards";
import { getNavbarSessionState } from "@/lib/auth/navbar-session";
import WebsiteNavbar from "@/components/WebsiteNavbar";

export default async function GuestGroupLayout({ children }: { children: React.ReactNode }) {
  await blockPageRole(["Admin", "Staff"]);
  const session = await getNavbarSessionState();

  return (
    <>
      <WebsiteNavbar session={session} />
      {children}
    </>
  );
}