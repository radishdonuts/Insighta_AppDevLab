import Link from "next/link";

export default function NoAccessTicketPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top_left,_rgba(15,23,42,0.08),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.18),_transparent_24%),linear-gradient(180deg,_#f8fbff_0%,_#eef5ff_42%,_#ffffff_100%)] text-slate-950">
      <main className="flex-1 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-white/70 bg-white/75 p-8 shadow-[0_30px_80px_rgba(15,23,42,0.08)] backdrop-blur sm:p-10">
          <h1 className="mb-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            No Ticket Access
          </h1>
          <p className="mb-2 text-base leading-relaxed text-slate-600">
            This ticket is not associated with your account.
          </p>
          <p className="mb-8 text-sm leading-relaxed text-slate-500">
            Contact support if you believe this is a mistake.
          </p>

          <Link
            href="/my_tickets"
            className="inline-flex items-center justify-center rounded-full bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-700"
          >
            Go to My Tickets
          </Link>
        </div>
      </main>
    </div>
  );
}
