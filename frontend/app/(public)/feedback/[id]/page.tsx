import UniversalFeedbackPage from "@/components/UniversalFeedbackPage";

export default function FeedbackByTicketPage({ params }: { params: { id: string } }) {
  return <UniversalFeedbackPage sourceTicketId={params.id} />;
}
