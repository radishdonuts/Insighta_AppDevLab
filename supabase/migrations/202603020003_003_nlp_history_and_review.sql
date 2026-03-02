create table if not exists public.ticket_nlp_analyses (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  input_text text not null,
  model_provider text not null,
  model_name text not null,
  model_version text not null,
  prompt_version text null,
  sentiment sentiment_label null,
  detected_intent_id uuid null references public.nlp_intent_labels(id),
  detected_intent_raw text null,
  issue_type_id uuid null references public.nlp_issue_type_labels(id),
  issue_type_raw text null,
  priority ticket_priority null,
  category_id uuid null references public.complaint_categories(id),
  category_name_raw text null,
  confidence numeric(5,4) null check (confidence is null or (confidence >= 0 and confidence <= 1)),
  raw_output jsonb null,
  status text not null check (status in ('succeeded', 'failed', 'skipped')),
  error_message text null,
  is_applied boolean not null default false,
  created_at timestamptz not null default now(),
  applied_at timestamptz null
);

create index if not exists ticket_nlp_analyses_ticket_idx
on public.ticket_nlp_analyses(ticket_id, created_at desc);

create table if not exists public.ticket_nlp_reviews (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  analysis_id uuid null references public.ticket_nlp_analyses(id) on delete set null,
  reviewer_id uuid not null references public.profiles(id),
  corrected_sentiment sentiment_label null,
  corrected_intent_id uuid null references public.nlp_intent_labels(id),
  corrected_issue_type_id uuid null references public.nlp_issue_type_labels(id),
  corrected_priority ticket_priority null,
  corrected_category_id uuid null references public.complaint_categories(id),
  notes text null,
  created_at timestamptz not null default now()
);

alter table public.tickets add column if not exists detected_intent_id uuid null references public.nlp_intent_labels(id);
alter table public.tickets add column if not exists issue_type_id uuid null references public.nlp_issue_type_labels(id);
alter table public.tickets add column if not exists nlp_confidence numeric(5,4) null;
alter table public.tickets add column if not exists nlp_model_version text null;
alter table public.tickets add column if not exists nlp_updated_at timestamptz null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tickets_nlp_confidence_chk'
      and conrelid = 'public.tickets'::regclass
  ) then
    alter table public.tickets
      add constraint tickets_nlp_confidence_chk
      check (nlp_confidence is null or (nlp_confidence >= 0 and nlp_confidence <= 1));
  end if;
end $$;
