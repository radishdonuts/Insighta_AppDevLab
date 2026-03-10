import { redirect } from "next/navigation";
import { getServerAuthRoleContext } from "@/lib/auth/server";
import { InsightaLandingPage } from "@/components/ui/landing-page";

export default async function HomePage() {
  // Block Admin/Staff from accessing the landing page - redirect to their respective dashboards
  const ctx = await getServerAuthRoleContext();
  
  if (ctx.status === "authorized") {
    const role = ctx.auth.role;
    if (role === "Admin") {
      redirect("/admin");
    }
    if (role === "Staff") {
      redirect("/staff");
    }
  }

  return <InsightaLandingPage />;
}
