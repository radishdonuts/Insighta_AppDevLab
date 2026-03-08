// app/(guest)/layout.tsx
import { blockAuthenticatedUsers } from "@/lib/auth/page-guards";
import { getNavbarSessionState } from "@/lib/auth/navbar-session";
import WebsiteNavbar from "@/components/WebsiteNavbar";

export default async function GuestGroupLayout({ children }: { children: React.ReactNode }) {
  await blockAuthenticatedUsers();
  const session = await getNavbarSessionState();

  return (
    <div className="public-theme">
      <WebsiteNavbar session={session} />
      {children}
    </div>
  );
}
