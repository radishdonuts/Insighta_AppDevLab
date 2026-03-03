import type { Metadata } from "next";
import PublicNavbar from "./PublicNavbar";

export const metadata: Metadata = {
  title: "Insighta",
  description: "AI-Powered Complaint Resolution for Insurance"
};

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PublicNavbar />
      {children}
    </>
  );
}
