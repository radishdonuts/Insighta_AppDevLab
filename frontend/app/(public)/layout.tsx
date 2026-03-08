import type { Metadata } from "next";

import { getNavbarSessionState } from "@/lib/auth/navbar-session";
import PublicLayoutShell from "@/components/PublicLayoutShell";

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

  return <PublicLayoutShell session={session}>{children}</PublicLayoutShell>;
}
