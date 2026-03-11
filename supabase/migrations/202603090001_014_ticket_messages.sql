create table if not exists public.ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  sender_type text not null,
  content text not null,
  created_at timestamptz not null default now(),
  constraint ticket_messages_sender_type_chk
    check (sender_type in ('staff', 'customer', 'guest')),
  constraint ticket_messages_content_not_blank_chk
    check (char_length(btrim(content)) > 0),
  constraint ticket_messages_content_len_chk
    check (char_length(content) <= 5000)
);

create index if not exists ticket_messages_ticket_id_created_at_idx
  on public.ticket_messages (ticket_id, created_at);
