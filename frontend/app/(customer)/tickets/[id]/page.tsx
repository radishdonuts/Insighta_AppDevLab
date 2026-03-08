import { redirect } from "next/navigation";

import TicketDetailPage from "@/app/(guest)/view/[id]/page";
import { getSupabaseServerClient } from "@/lib/supabase";
import { createClient } from "@/utils/supabase/server";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export default async function CustomerTicketDetailPage({ params }: { params: { id: string } }) {
  if (!isUuid(params.id)) {
    redirect("/no_access_ticket");
  }

  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("tickets")
    .select("id")
    .eq("id", params.id)
    .eq("customer_id", user.id)
    .limit(1)
    .maybeSingle();

  if (error || !data?.id) {
    redirect("/no_access_ticket");
  }

  return <TicketDetailPage params={params} />;
}
