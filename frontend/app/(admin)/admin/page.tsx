import WelcomeSplitHero from "@/components/WelcomeSplitHero";
import { getServerAuthRoleContext } from "@/lib/auth/server";

export default async function AdminPage() {
  const result = await getServerAuthRoleContext();
  const firstName = result.status === "authorized" ? result.auth.firstName : null;

  return (
    <WelcomeSplitHero
      roleLabel="Admin"
      firstName={firstName}
      description="Review platform health, monitor ticket trends, and manage staff operations from the admin workspace."
      ctaHref="/admin/overview"
      ctaLabel="Go to Overview"
    />
  );
}
