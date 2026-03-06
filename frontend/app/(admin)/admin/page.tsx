import WelcomeSplitHero from "@/components/WelcomeSplitHero";
import { getServerAuthRoleContext } from "@/lib/auth/server";

export default async function AdminPage() {
  const result = await getServerAuthRoleContext();
  const firstName = result.status === "authorized" ? result.auth.firstName : null;

  return (
    <WelcomeSplitHero
      roleLabel="Admin"
      firstName={firstName}
      description="Review platform health, monitor ticket trends, and manage categories using the button below."
      ctaHref="/admin/overview"
      ctaLabel="Go to Overview"
    />
  );
}
