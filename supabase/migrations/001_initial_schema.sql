-- Tá Pago Hub - Schema inicial
-- Execute este arquivo no SQL Editor do Supabase

-- ============================================================
-- PERFIS DE USUÁRIO
-- ============================================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  avatar_url text,
  default_pay_day int check (default_pay_day between 1 and 31),
  created_at timestamptz default now() not null
);

-- Cria perfil automaticamente ao registrar usuário
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- RESIDÊNCIAS (HOUSEHOLDS)
-- ============================================================
create table public.households (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  created_at timestamptz default now() not null
);

create table public.household_members (
  household_id uuid references public.households on delete cascade not null,
  user_id uuid references public.profiles on delete cascade not null,
  role text not null default 'member' check (role in ('owner', 'member')),
  primary key (household_id, user_id)
);

-- ============================================================
-- PERFIS FINANCEIROS (Pessoal / Empresarial)
-- ============================================================
create table public.financial_profiles (
  id uuid default gen_random_uuid() primary key,
  household_id uuid references public.households on delete cascade not null,
  name text not null,
  type text not null check (type in ('personal', 'business')),
  icon text,
  color text,
  created_at timestamptz default now() not null
);

-- ============================================================
-- CATEGORIAS
-- ============================================================
create table public.categories (
  id uuid default gen_random_uuid() primary key,
  financial_profile_id uuid references public.financial_profiles on delete cascade not null,
  name text not null,
  icon text,
  color text,
  is_revenue boolean not null default false,
  sort_order int not null default 0
);

-- ============================================================
-- CONTAS (BILLS)
-- ============================================================
create table public.bills (
  id uuid default gen_random_uuid() primary key,
  financial_profile_id uuid references public.financial_profiles on delete cascade not null,
  category_id uuid references public.categories on delete set null,
  name text not null,
  type text not null check (type in ('expense', 'revenue')),
  recurrence text not null check (recurrence in ('monthly', 'quarterly', 'annual', 'one_time')),
  expected_amount numeric(12,2) not null default 0,
  due_day int check (due_day between 1 and 31),
  pix_key text,
  pix_key_type text check (pix_key_type in ('cpf', 'cnpj', 'email', 'telefone', 'aleatoria')),
  payee_name text,
  notes text,
  is_active boolean not null default true,
  auto_debit boolean not null default false,
  created_at timestamptz default now() not null
);

-- ============================================================
-- LANÇAMENTOS MENSAIS (BILL ENTRIES)
-- ============================================================
create table public.bill_entries (
  id uuid default gen_random_uuid() primary key,
  bill_id uuid references public.bills on delete cascade not null,
  month int not null check (month between 1 and 12),
  year int not null,
  actual_amount numeric(12,2) not null default 0,
  status text not null default 'pending' check (status in ('pending', 'paid', 'overdue', 'skipped')),
  paid_at timestamptz,
  paid_by uuid references public.profiles,
  payment_proof_url text,
  notes text,
  created_at timestamptz default now() not null,
  unique (bill_id, month, year)
);

-- ============================================================
-- SESSÕES DE PAGAMENTO (PAY DAY MODE)
-- ============================================================
create table public.payment_sessions (
  id uuid default gen_random_uuid() primary key,
  financial_profile_id uuid references public.financial_profiles on delete cascade not null,
  started_by uuid references public.profiles not null,
  month int not null check (month between 1 and 12),
  year int not null,
  started_at timestamptz default now() not null,
  completed_at timestamptz,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'abandoned')),
  total_paid numeric(12,2) not null default 0
);

create table public.payment_session_items (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references public.payment_sessions on delete cascade not null,
  bill_entry_id uuid references public.bill_entries on delete cascade not null,
  checked_at timestamptz default now() not null,
  checked_by uuid references public.profiles not null
);

-- ============================================================
-- METAS (GOALS)
-- ============================================================
create table public.goals (
  id uuid default gen_random_uuid() primary key,
  financial_profile_id uuid references public.financial_profiles on delete cascade not null,
  name text not null,
  target_amount numeric(12,2) not null,
  current_amount numeric(12,2) not null default 0,
  target_date date,
  icon text,
  color text,
  created_at timestamptz default now() not null
);

-- ============================================================
-- IMPORTAÇÕES BANCÁRIAS
-- ============================================================
create table public.bank_imports (
  id uuid default gen_random_uuid() primary key,
  financial_profile_id uuid references public.financial_profiles on delete cascade not null,
  imported_by uuid references public.profiles not null,
  file_name text not null,
  imported_at timestamptz default now() not null,
  row_count int not null default 0
);

create table public.bank_transactions (
  id uuid default gen_random_uuid() primary key,
  import_id uuid references public.bank_imports on delete cascade not null,
  date date not null,
  description text not null,
  amount numeric(12,2) not null,
  type text not null check (type in ('credit', 'debit')),
  matched_bill_entry_id uuid references public.bill_entries on delete set null,
  category_id uuid references public.categories on delete set null,
  is_reconciled boolean not null default false
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.financial_profiles enable row level security;
alter table public.categories enable row level security;
alter table public.bills enable row level security;
alter table public.bill_entries enable row level security;
alter table public.payment_sessions enable row level security;
alter table public.payment_session_items enable row level security;
alter table public.goals enable row level security;
alter table public.bank_imports enable row level security;
alter table public.bank_transactions enable row level security;

-- Função auxiliar: retorna household_ids do usuário atual
create or replace function public.my_household_ids()
returns setof uuid language sql security definer stable as $$
  select household_id from public.household_members where user_id = auth.uid()
$$;

-- profiles
create policy "profiles_select" on public.profiles for select using (id = auth.uid());
create policy "profiles_update" on public.profiles for update using (id = auth.uid());

-- households
create policy "households_select" on public.households for select
  using (id in (select my_household_ids()));
create policy "households_insert" on public.households for insert
  with check (true);

-- household_members
create policy "household_members_select" on public.household_members for select
  using (household_id in (select my_household_ids()));
create policy "household_members_insert" on public.household_members for insert
  with check (true);

-- financial_profiles
create policy "financial_profiles_select" on public.financial_profiles for select
  using (household_id in (select my_household_ids()));
create policy "financial_profiles_insert" on public.financial_profiles for insert
  with check (household_id in (select my_household_ids()));
create policy "financial_profiles_update" on public.financial_profiles for update
  using (household_id in (select my_household_ids()));
create policy "financial_profiles_delete" on public.financial_profiles for delete
  using (household_id in (select my_household_ids()));

-- categories
create policy "categories_all" on public.categories for all
  using (financial_profile_id in (
    select id from public.financial_profiles
    where household_id in (select my_household_ids())
  ));

-- bills
create policy "bills_all" on public.bills for all
  using (financial_profile_id in (
    select id from public.financial_profiles
    where household_id in (select my_household_ids())
  ));

-- bill_entries
create policy "bill_entries_all" on public.bill_entries for all
  using (bill_id in (
    select id from public.bills
    where financial_profile_id in (
      select id from public.financial_profiles
      where household_id in (select my_household_ids())
    )
  ));

-- payment_sessions
create policy "payment_sessions_all" on public.payment_sessions for all
  using (financial_profile_id in (
    select id from public.financial_profiles
    where household_id in (select my_household_ids())
  ));

-- payment_session_items
create policy "payment_session_items_all" on public.payment_session_items for all
  using (session_id in (
    select id from public.payment_sessions
    where financial_profile_id in (
      select id from public.financial_profiles
      where household_id in (select my_household_ids())
    )
  ));

-- goals
create policy "goals_all" on public.goals for all
  using (financial_profile_id in (
    select id from public.financial_profiles
    where household_id in (select my_household_ids())
  ));

-- bank_imports
create policy "bank_imports_all" on public.bank_imports for all
  using (financial_profile_id in (
    select id from public.financial_profiles
    where household_id in (select my_household_ids())
  ));

-- bank_transactions
create policy "bank_transactions_all" on public.bank_transactions for all
  using (import_id in (
    select id from public.bank_imports
    where financial_profile_id in (
      select id from public.financial_profiles
      where household_id in (select my_household_ids())
    )
  ));

-- ============================================================
-- ÍNDICES para performance
-- ============================================================
create index bill_entries_bill_id_idx on public.bill_entries (bill_id);
create index bill_entries_year_month_idx on public.bill_entries (year, month);
create index bills_financial_profile_id_idx on public.bills (financial_profile_id);
create index payment_sessions_financial_profile_id_idx on public.payment_sessions (financial_profile_id);
create index bank_transactions_import_id_idx on public.bank_transactions (import_id);
