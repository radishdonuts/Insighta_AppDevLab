-- Repair ticket field source columns for environments that missed prior migration.

alter table public.tickets
  add column if not exists category_source text,
  add column if not exists priority_source text;

update public.tickets
set category_source = coalesce(category_source, 'default'),
    priority_source = coalesce(priority_source, 'default');

alter table public.tickets
  alter column category_source set default 'default',
  alter column priority_source set default 'default';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tickets_category_source_chk'
      and conrelid = 'public.tickets'::regclass
  ) then
    alter table public.tickets
      add constraint tickets_category_source_chk
      check (category_source in ('user', 'nlp', 'human_intervention', 'default'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tickets_priority_source_chk'
      and conrelid = 'public.tickets'::regclass
  ) then
    alter table public.tickets
      add constraint tickets_priority_source_chk
      check (priority_source in ('user', 'nlp', 'human_intervention', 'default'));
  end if;
end $$;

