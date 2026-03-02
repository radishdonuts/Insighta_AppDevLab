create table if not exists public.nlp_intent_labels (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  display_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.nlp_issue_type_labels (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  display_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.nlp_issue_category_map (
  issue_type_id uuid primary key references public.nlp_issue_type_labels(id) on delete cascade,
  category_id uuid not null references public.complaint_categories(id),
  default_priority ticket_priority null,
  created_at timestamptz not null default now()
);

insert into public.nlp_intent_labels (code, display_name, is_active)
values
  ('general_complaint', 'General Complaint', true),
  ('request_status_update', 'Request Status Update', true),
  ('request_refund', 'Request Refund', true),
  ('request_cancellation', 'Request Cancellation', true),
  ('appeal_claim_decision', 'Appeal Claim Decision', true),
  ('report_billing_error', 'Report Billing Error', true),
  ('report_policy_change_issue', 'Report Policy Change Issue', true),
  ('report_document_processing_delay', 'Report Document Processing Delay', true)
on conflict (code) do update
set
  display_name = excluded.display_name,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.nlp_issue_type_labels (code, display_name, is_active)
values
  ('claim_denial', 'Claim Denial', true),
  ('billing_dispute', 'Billing Dispute', true),
  ('policy_cancellation', 'Policy Cancellation', true),
  ('policy_update_issue', 'Policy Update Issue', true),
  ('payment_issue', 'Payment Issue', true),
  ('document_processing_delay', 'Document Processing Delay', true),
  ('technical_issue', 'Technical Issue', true),
  ('fraud_report', 'Fraud Report', true),
  ('delivery_issue', 'Delivery Issue', true),
  ('uncategorized', 'Uncategorized', true)
on conflict (code) do update
set
  display_name = excluded.display_name,
  is_active = excluded.is_active,
  updated_at = now();

with mapping_candidates as (
  select
    it.id as issue_type_id,
    case it.code
      when 'claim_denial' then 'Claim Denial'
      when 'billing_dispute' then 'Billing Issues'
      when 'policy_cancellation' then 'Policy Cancellation'
      when 'policy_update_issue' then 'Policy Update'
      when 'payment_issue' then 'Billing'
      when 'document_processing_delay' then 'Document Processing'
      when 'technical_issue' then 'Technical Support'
      when 'fraud_report' then 'Fraud'
      when 'delivery_issue' then 'Delivery Issues'
      else 'Uncategorized'
    end as preferred_category,
    case it.code
      when 'claim_denial' then 'High'::ticket_priority
      when 'fraud_report' then 'High'::ticket_priority
      when 'document_processing_delay' then 'Medium'::ticket_priority
      when 'delivery_issue' then 'Medium'::ticket_priority
      else null
    end as default_priority
  from public.nlp_issue_type_labels it
)
insert into public.nlp_issue_category_map (issue_type_id, category_id, default_priority)
select
  mc.issue_type_id,
  cc.id as category_id,
  mc.default_priority
from mapping_candidates mc
join public.complaint_categories cc
  on lower(cc.category_name) = lower(mc.preferred_category)
on conflict (issue_type_id) do update
set
  category_id = excluded.category_id,
  default_priority = excluded.default_priority;
