-- Remove ticket linkage from feedback; feedback is company-level only.

alter table public.feedback
  drop constraint if exists feedback_ticket_id_fkey;

alter table public.feedback
  drop column if exists ticket_id;
