import { getServerAuthRoleContext } from "@/lib/auth/server";
import TicketSubmitFlow from "@/components/TicketSubmitFlow";

export default async function SubmitPage() {
  const ctx = await getServerAuthRoleContext();

  // Determine audience based on auth status
  const isCustomer =
    ctx.status === "authorized" && ctx.auth.role === "Customer";
  const audience = isCustomer ? "customer" : "guest";

  return <TicketSubmitFlow audience={audience} />;
}
