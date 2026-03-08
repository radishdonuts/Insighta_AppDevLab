create table if not exists public.ticket_nlp_jobs (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  input_text text null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'succeeded', 'failed')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error text null,
  available_at timestamptz not null default now(),
  locked_at timestamptz null,
  locked_by text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ticket_nlp_jobs_ticket_id_key unique (ticket_id)
);

create index if not exists ticket_nlp_jobs_dequeue_idx
  on public.ticket_nlp_jobs (status, available_at, created_at);

create index if not exists ticket_nlp_jobs_ticket_idx
  on public.ticket_nlp_jobs (ticket_id);
