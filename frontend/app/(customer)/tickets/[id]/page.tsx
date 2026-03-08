import TicketDetailPage from "@/app/(guest)/view/[id]/page";

export default function CustomerTicketDetailPage({ params }: { params: { id: string } }) {
  return <TicketDetailPage params={params} />;
}
