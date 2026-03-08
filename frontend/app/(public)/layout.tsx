import type { Metadata } from "next";

import { getNavbarSessionState } from "@/lib/auth/navbar-session";
import AppNavbar from "../../components/AppNavbar";

export const metadata: Metadata = {
  title: "Insighta",
  description: "AI-Powered Complaint Resolution for Insurance",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getNavbarSessionState();

  return (
    <div className="public-theme">
      <AppNavbar session={session} />
      {children}
    </div>
  );
}
