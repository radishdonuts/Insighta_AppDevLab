import WelcomeSplitHero from "@/components/WelcomeSplitHero";
import { getServerAuthRoleContext } from "@/lib/auth/server";

export default async function StaffPage() {
  const result = await getServerAuthRoleContext();
  const firstName = result.status === "authorized" ? result.auth.firstName : null;

  return (
    <WelcomeSplitHero
      roleLabel="Staff"
      firstName={firstName}
      description="Start your shift with a clear queue view and jump into assigned tickets from the button below."
      ctaHref="/staff/work-tickets"
      ctaLabel="Go to My Tickets"
    />
  );
}