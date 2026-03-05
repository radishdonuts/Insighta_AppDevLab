-- Multi-category feedback ratings (1-5) with one row per category.

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'feedback_rating_category'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.feedback_rating_category as enum (
      'overall_experience',
      'speed_turnaround_time',
      'communication_updates',
      'resolution_quality_fairness',
      'ease_of_process',
      'staff_helpfulness_professionalism',
      'platform_app_website_experience'
    );
  end if;
end $$;

create table if not exists public.feedback_category_ratings (
  feedback_id uuid not null references public.feedback(id) on delete cascade,
  category public.feedback_rating_category not null,
  rating integer not null check (rating >= 1 and rating <= 5),
  created_at timestamptz not null default now(),
  primary key (feedback_id, category)
);

create index if not exists feedback_category_ratings_category_idx
on public.feedback_category_ratings(category);

-- Backfill existing single-rating feedback into all rating categories.
insert into public.feedback_category_ratings (feedback_id, category, rating)
select
  f.id,
  category.category,
  f.rating
from public.feedback f
cross join (
  values
    ('overall_experience'::public.feedback_rating_category),
    ('speed_turnaround_time'::public.feedback_rating_category),
    ('communication_updates'::public.feedback_rating_category),
    ('resolution_quality_fairness'::public.feedback_rating_category),
    ('ease_of_process'::public.feedback_rating_category),
    ('staff_helpfulness_professionalism'::public.feedback_rating_category),
    ('platform_app_website_experience'::public.feedback_rating_category)
) as category(category)
where f.rating between 1 and 5
on conflict (feedback_id, category) do nothing;
