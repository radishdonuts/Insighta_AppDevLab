import StaffTicketDetailClient from "@/components/features/staff/ticket-detail/StaffTicketDetailClient";

export default function AdminWorkTicketDetailPage({
  params,
}: {
  params: { ticketId: string };
}) {
  return (
    <StaffTicketDetailClient
      ticketId={params.ticketId}
      mode="admin"
      apiBasePath="/api/admin/tickets"
      backHref="/admin/work-tickets"
    />
  );
}
