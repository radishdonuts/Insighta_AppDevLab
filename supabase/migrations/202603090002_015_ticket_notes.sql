create table if not exists public.ticket_notes (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  content text not null,
  created_at timestamptz not null default now(),
  constraint ticket_notes_content_not_blank_chk
    check (char_length(btrim(content)) > 0),
  constraint ticket_notes_content_len_chk
    check (char_length(content) <= 2000)
);

create index if not exists ticket_notes_ticket_id_created_at_idx
  on public.ticket_notes (ticket_id, created_at);
