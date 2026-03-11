-- Make feedback company-level by removing mandatory ticket binding.

alter table public.feedback
  alter column ticket_id drop not null;

do $$
declare
  v_ticket_attnum smallint;
  v_constraint_name text;
begin
  select attnum
  into v_ticket_attnum
  from pg_attribute
  where attrelid = 'public.feedback'::regclass
    and attname = 'ticket_id'
    and not attisdropped;

  if v_ticket_attnum is not null then
    for v_constraint_name in
      select conname
      from pg_constraint
      where conrelid = 'public.feedback'::regclass
        and contype = 'u'
        and conkey = array[v_ticket_attnum]
    loop
      execute format('alter table public.feedback drop constraint if exists %I', v_constraint_name);
    end loop;
  end if;
end $$;

drop index if exists public.feedback_ticket_id_key;
