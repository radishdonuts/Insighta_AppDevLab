alter table public.tickets add column if not exists title text;
alter table public.tickets add column if not exists nlp_input_text text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tickets_title_len_chk'
      and conrelid = 'public.tickets'::regclass
  ) then
    alter table public.tickets
      add constraint tickets_title_len_chk
      check (title is null or char_length(title) <= 120);
  end if;
end $$;

create index if not exists tickets_nlp_pending_idx
on public.tickets (submitted_at desc)
where sentiment is null or detected_intent is null or issue_type is null;

update public.tickets
set nlp_input_text = description
where nlp_input_text is null and description is not null;
