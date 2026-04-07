export type ProfileRole = 'owner' | 'member'
export type FinancialProfileType = 'personal' | 'business'
export type BillType = 'expense' | 'revenue'
export type BillRecurrence = 'monthly' | 'quarterly' | 'annual' | 'one_time'
export type BillEntryStatus = 'pending' | 'paid' | 'overdue' | 'skipped'
export type PaymentSessionStatus = 'in_progress' | 'completed' | 'abandoned'
export type PixKeyType = 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria'
export type TransactionType = 'credit' | 'debit'

export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  default_pay_day: number | null
  created_at: string
}

export interface Household {
  id: string
  name: string
  created_at: string
}

export interface HouseholdMember {
  household_id: string
  user_id: string
  role: ProfileRole
}

export interface FinancialProfile {
  id: string
  household_id: string
  name: string
  type: FinancialProfileType
  icon: string | null
  color: string | null
  created_at: string
}

export interface Category {
  id: string
  financial_profile_id: string
  name: string
  icon: string | null
  color: string | null
  is_revenue: boolean
  sort_order: number
}

export interface Bill {
  id: string
  financial_profile_id: string
  category_id: string | null
  name: string
  type: BillType
  recurrence: BillRecurrence
  expected_amount: number
  due_day: number | null
  pix_key: string | null
  pix_key_type: PixKeyType | null
  payee_name: string | null
  notes: string | null
  is_active: boolean
  auto_debit: boolean
  created_at: string
}

export interface BillEntry {
  id: string
  bill_id: string
  month: number
  year: number
  actual_amount: number
  status: BillEntryStatus
  paid_at: string | null
  paid_by: string | null
  payment_proof_url: string | null
  notes: string | null
  created_at: string
}

export interface PaymentSession {
  id: string
  financial_profile_id: string
  started_by: string
  month: number
  year: number
  started_at: string
  completed_at: string | null
  status: PaymentSessionStatus
  total_paid: number
}

export interface PaymentSessionItem {
  id: string
  session_id: string
  bill_entry_id: string
  checked_at: string
  checked_by: string
}

export interface Goal {
  id: string
  financial_profile_id: string
  name: string
  target_amount: number
  current_amount: number
  target_date: string | null
  icon: string | null
  color: string | null
  created_at: string
}

export interface BankImport {
  id: string
  financial_profile_id: string
  imported_by: string
  file_name: string
  imported_at: string
  row_count: number
}

export interface BankTransaction {
  id: string
  import_id: string
  date: string
  description: string
  amount: number
  type: TransactionType
  matched_bill_entry_id: string | null
  category_id: string | null
  is_reconciled: boolean
}

export interface DescriptionMapping {
  id: string
  financial_profile_id: string
  description: string
  bill_id: string
  created_at: string
}

// Extended types with joins
export interface BillWithCategory extends Bill {
  category: Category | null
}

export interface BillEntryWithBill extends BillEntry {
  bill: BillWithCategory
}

export interface PaymentSessionWithItems extends PaymentSession {
  items: PaymentSessionItem[]
}
