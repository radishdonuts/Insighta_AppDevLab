import UniversalFeedbackPage from "@/components/UniversalFeedbackPage";
import { createClient } from "@/utils/supabase/server";

export default async function FeedbackByTicketPage({ params }: { params: { id: string } }) {
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  const submitterEmail = typeof user?.email === "string" ? user.email.trim().toLowerCase() : null;

  return <UniversalFeedbackPage sourceTicketId={params.id} submitterEmail={submitterEmail} />;
}
