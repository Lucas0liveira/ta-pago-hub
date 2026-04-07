-- Description-to-bill mappings for reconciliation memory
-- When a user links a bank description to a bill, we remember it so
-- future imports are auto-reconciled for matching descriptions.

create table public.description_mappings (
  id uuid default gen_random_uuid() primary key,
  financial_profile_id uuid references public.financial_profiles on delete cascade not null,
  description text not null,
  bill_id uuid references public.bills on delete cascade not null,
  created_at timestamptz default now() not null,
  unique (financial_profile_id, description)
);

alter table public.description_mappings enable row level security;

create policy "description_mappings_all" on public.description_mappings for all
  using (financial_profile_id in (
    select id from public.financial_profiles
    where household_id in (select my_household_ids())
  ));

create index description_mappings_profile_id_idx on public.description_mappings (financial_profile_id);
