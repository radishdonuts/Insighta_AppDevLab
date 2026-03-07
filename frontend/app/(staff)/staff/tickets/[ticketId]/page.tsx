import StaffTicketDetailClient from "@/components/features/staff/ticket-detail/StaffTicketDetailClient";

export default function StaffTicketDetailPage({
  params,
}: {
  params: { ticketId: string };
}) {
  return <StaffTicketDetailClient ticketId={params.ticketId} />;
}

