insert into public.nlp_intent_labels (code, display_name, is_active)
values ('share_positive_feedback', 'Share Positive Feedback', true)
on conflict (code) do update
set
  display_name = excluded.display_name,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.nlp_issue_type_labels (code, display_name, is_active)
values ('positive_feedback', 'Positive Feedback', true)
on conflict (code) do update
set
  display_name = excluded.display_name,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.complaint_categories (category_name, is_active)
select 'Positive Feedback', true
where not exists (
  select 1
  from public.complaint_categories
  where lower(category_name) = lower('Positive Feedback')
);

insert into public.nlp_issue_category_map (issue_type_id, category_id, default_priority)
select
  it.id,
  cc.id,
  'Low'::ticket_priority
from public.nlp_issue_type_labels it
join public.complaint_categories cc
  on lower(cc.category_name) = lower('Positive Feedback')
where it.code = 'positive_feedback'
on conflict (issue_type_id) do update
set
  category_id = excluded.category_id,
  default_priority = excluded.default_priority;

