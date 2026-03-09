import StaffWorkspaceClient from "@/components/features/staff/workspace/StaffWorkspaceClient";

export const dynamic = "force-dynamic";

export default function AdminWorkTicketsPage() {
  return <StaffWorkspaceClient mode="admin" />;
}
