-- Hard cutover: complaint NLP stores only category_name + priority.
-- Removes sentiment / intent / issue-type taxonomy dependencies.

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'complaint_category_name'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.complaint_category_name as enum (
      'Policy & Account Servicing',
      'Claims Experience',
      'Payments, Billing & Refunds',
      'Documents & Requirements',
      'Customer Support & Service Quality',
      'Digital Access & Technical Issues',
      'Fraud, Security & Privacy',
      'Product/Partner Service Delivery',
      'Other / Uncategorized'
    );
  end if;
end $$;

alter table public.tickets
  add column if not exists category_name public.complaint_category_name;

-- Seed and lock active complaint categories to the fixed taxonomy.
insert into public.complaint_categories (category_name, is_active)
select v.category_name, true
from (
  values
    ('Policy & Account Servicing'),
    ('Claims Experience'),
    ('Payments, Billing & Refunds'),
    ('Documents & Requirements'),
    ('Customer Support & Service Quality'),
    ('Digital Access & Technical Issues'),
    ('Fraud, Security & Privacy'),
    ('Product/Partner Service Delivery'),
    ('Other / Uncategorized')
) as v(category_name)
where not exists (
  select 1
  from public.complaint_categories c
  where lower(c.category_name) = lower(v.category_name)
);

update public.complaint_categories
set is_active = true
where lower(category_name) in (
  lower('Policy & Account Servicing'),
  lower('Claims Experience'),
  lower('Payments, Billing & Refunds'),
  lower('Documents & Requirements'),
  lower('Customer Support & Service Quality'),
  lower('Digital Access & Technical Issues'),
  lower('Fraud, Security & Privacy'),
  lower('Product/Partner Service Delivery'),
  lower('Other / Uncategorized')
);

update public.complaint_categories
set is_active = false
where lower(category_name) not in (
  lower('Policy & Account Servicing'),
  lower('Claims Experience'),
  lower('Payments, Billing & Refunds'),
  lower('Documents & Requirements'),
  lower('Customer Support & Service Quality'),
  lower('Digital Access & Technical Issues'),
  lower('Fraud, Security & Privacy'),
  lower('Product/Partner Service Delivery'),
  lower('Other / Uncategorized')
);

-- Backfill tickets.category_name from current category relation and legacy text.
with category_map as (
  select
    t.id as ticket_id,
    case
      when lower(cc.category_name) in (lower('policy & account servicing'), lower('policy cancellation'), lower('policy update')) then 'Policy & Account Servicing'
      when lower(cc.category_name) in (lower('claims experience'), lower('claim denial')) then 'Claims Experience'
      when lower(cc.category_name) in (lower('payments, billing & refunds'), lower('billing issues'), lower('billing'), lower('billing dispute')) then 'Payments, Billing & Refunds'
      when lower(cc.category_name) in (lower('documents & requirements'), lower('document processing')) then 'Documents & Requirements'
      when lower(cc.category_name) in (lower('customer support & service quality')) then 'Customer Support & Service Quality'
      when lower(cc.category_name) in (lower('digital access & technical issues'), lower('technical support')) then 'Digital Access & Technical Issues'
      when lower(cc.category_name) in (lower('fraud, security & privacy'), lower('fraud')) then 'Fraud, Security & Privacy'
      when lower(cc.category_name) in (lower('product/partner service delivery'), lower('delivery issues')) then 'Product/Partner Service Delivery'
      else null
    end as mapped_name
  from public.tickets t
  left join public.complaint_categories cc on cc.id = t.category_id
)
update public.tickets t
set category_name = (cm.mapped_name)::public.complaint_category_name
from category_map cm
where t.id = cm.ticket_id
  and t.category_name is null
  and cm.mapped_name is not null;

update public.tickets
set category_name = case
  when lower(issue_type) in (lower('claim denial')) then 'Claims Experience'::public.complaint_category_name
  when lower(issue_type) in (lower('billing dispute'), lower('payment issue')) then 'Payments, Billing & Refunds'::public.complaint_category_name
  when lower(issue_type) in (lower('policy cancellation'), lower('policy update issue')) then 'Policy & Account Servicing'::public.complaint_category_name
  when lower(issue_type) in (lower('document processing delay')) then 'Documents & Requirements'::public.complaint_category_name
  when lower(issue_type) in (lower('technical issue')) then 'Digital Access & Technical Issues'::public.complaint_category_name
  when lower(issue_type) in (lower('fraud report')) then 'Fraud, Security & Privacy'::public.complaint_category_name
  when lower(issue_type) in (lower('delivery issue')) then 'Product/Partner Service Delivery'::public.complaint_category_name
  else 'Other / Uncategorized'::public.complaint_category_name
end
where category_name is null;

update public.tickets
set priority = 'Medium'::ticket_priority
where priority is null;

alter table public.tickets
  alter column category_name set default 'Other / Uncategorized'::public.complaint_category_name,
  alter column category_name set not null,
  alter column priority set default 'Medium'::ticket_priority,
  alter column priority set not null;

drop index if exists public.tickets_nlp_pending_idx;

-- Update NLP analysis log schema.
alter table public.ticket_nlp_analyses
  add column if not exists category_name public.complaint_category_name;

update public.ticket_nlp_analyses
set category_name = case
  when lower(category_name_raw) in (lower('policy & account servicing'), lower('policy cancellation'), lower('policy update')) then 'Policy & Account Servicing'::public.complaint_category_name
  when lower(category_name_raw) in (lower('claims experience'), lower('claim denial')) then 'Claims Experience'::public.complaint_category_name
  when lower(category_name_raw) in (lower('payments, billing & refunds'), lower('billing issues'), lower('billing'), lower('billing dispute')) then 'Payments, Billing & Refunds'::public.complaint_category_name
  when lower(category_name_raw) in (lower('documents & requirements'), lower('document processing')) then 'Documents & Requirements'::public.complaint_category_name
  when lower(category_name_raw) in (lower('customer support & service quality')) then 'Customer Support & Service Quality'::public.complaint_category_name
  when lower(category_name_raw) in (lower('digital access & technical issues'), lower('technical support')) then 'Digital Access & Technical Issues'::public.complaint_category_name
  when lower(category_name_raw) in (lower('fraud, security & privacy'), lower('fraud')) then 'Fraud, Security & Privacy'::public.complaint_category_name
  when lower(category_name_raw) in (lower('product/partner service delivery'), lower('delivery issues')) then 'Product/Partner Service Delivery'::public.complaint_category_name
  else 'Other / Uncategorized'::public.complaint_category_name
end
where category_name is null;

alter table public.ticket_nlp_analyses
  drop column if exists sentiment,
  drop column if exists detected_intent_id,
  drop column if exists detected_intent_raw,
  drop column if exists issue_type_id,
  drop column if exists issue_type_raw,
  drop column if exists category_id,
  drop column if exists category_name_raw;

-- Update NLP review schema.
alter table public.ticket_nlp_reviews
  add column if not exists corrected_category_name public.complaint_category_name;

update public.ticket_nlp_reviews
set corrected_category_name = 'Other / Uncategorized'::public.complaint_category_name
where corrected_category_name is null and corrected_category_id is not null;

alter table public.ticket_nlp_reviews
  drop column if exists corrected_sentiment,
  drop column if exists corrected_intent_id,
  drop column if exists corrected_issue_type_id,
  drop column if exists corrected_category_id;

-- Remove legacy NLP fields from tickets.
alter table public.tickets
  drop column if exists sentiment,
  drop column if exists detected_intent,
  drop column if exists detected_intent_id,
  drop column if exists issue_type,
  drop column if exists issue_type_id;

-- Drop obsolete taxonomy tables.
drop table if exists public.nlp_issue_category_map cascade;
drop table if exists public.nlp_issue_type_labels cascade;
drop table if exists public.nlp_intent_labels cascade;

create index if not exists tickets_category_name_idx
on public.tickets(category_name);

