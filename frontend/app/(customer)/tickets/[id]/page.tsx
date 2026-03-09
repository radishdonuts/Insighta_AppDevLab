import CustomerTicketDetailClient from "@/components/features/customer/tickets/CustomerTicketDetailClient";

export default function CustomerTicketDetailPage({ params }: { params: { id: string } }) {
  return <CustomerTicketDetailClient ticketId={params.id} />;
}
