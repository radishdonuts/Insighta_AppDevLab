import type { NavbarSessionState } from "@/components/AppNavbar";
import AppNavbar from "@/components/AppNavbar";

type PublicLayoutShellProps = {
  children: React.ReactNode;
  session: NavbarSessionState;
};

export default function PublicLayoutShell({
  children,
  session,
}: PublicLayoutShellProps) {
  return (
    <div className="public-theme">
      <AppNavbar session={session} />
      {children}
    </div>
  );
}
