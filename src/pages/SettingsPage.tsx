import { useState, type FormEvent } from 'react'
import { User, Home, Palette, Wallet, Plus, Pencil, Trash2, Check, Copy, LogOut } from 'lucide-react'
import { clsx } from 'clsx'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../stores/authStore'
import { Modal } from '../components/ui/Modal'
import { applyTheme, getStoredTheme, ACCENT_OPTIONS } from '../lib/theme'
import type { ThemeMode, ThemeAccent } from '../lib/theme'

// ─── Financial profile icons / colors to pick ───────────────────────────────
const FP_ICONS = ['🏠', '💼', '💰', '🏋️', '✈️', '🎓', '🚗', '💻', '🌍', '📱', '🎯', '🏖️']
const FP_COLORS = [
  '#10b981', '#6366f1', '#f59e0b', '#ef4444',
  '#8b5cf6', '#0ea5e9', '#f97316', '#ec4899', '#14b8a6',
]

// ─── Helpers ─────────────────────────────────────────────────────────────────
function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-800">
        <Icon className="w-4 h-4 text-slate-400" />
        <h2 className="text-sm font-semibold text-white">{title}</h2>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-slate-500 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function SaveButton({ loading, label = 'Salvar' }: { loading: boolean; label?: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors"
    >
      {loading ? 'Salvando...' : label}
    </button>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { user, profile, household, financialProfiles, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/auth/login')
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6 pb-8">
      <div className="mb-2">
        <h1 className="text-2xl font-semibold text-white">Configurações</h1>
        <p className="text-sm text-slate-400 mt-0.5">Conta, residência e preferências</p>
      </div>

      {/* Account */}
      <Section title="Minha conta" icon={User}>
        <AccountSection user={user} profile={profile} />
      </Section>

      {/* Household */}
      <Section title="Residência" icon={Home}>
        <HouseholdSection household={household} />
      </Section>

      {/* Financial Profiles */}
      <Section title="Perfis Financeiros" icon={Wallet}>
        <ProfilesSection financialProfiles={financialProfiles} household={household} />
      </Section>

      {/* Appearance */}
      <Section title="Aparência" icon={Palette}>
        <AppearanceSection />
      </Section>

      {/* Sign out */}
      <button
        onClick={handleSignOut}
        className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors"
      >
        <LogOut className="w-4 h-4" />
        Sair da conta
      </button>
    </div>
  )
}

// ─── Account section ──────────────────────────────────────────────────────────
function AccountSection({ user, profile }: { user: any; profile: any }) {
  const [name, setName] = useState(profile?.full_name ?? '')
  const [savingName, setSavingName] = useState(false)
  const [nameSaved, setNameSaved] = useState(false)

  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [savingPw, setSavingPw] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwSaved, setPwSaved] = useState(false)

  async function handleSaveName(e: FormEvent) {
    e.preventDefault()
    setSavingName(true)
    await supabase.from('profiles').update({ full_name: name }).eq('id', user!.id)
    setSavingName(false)
    setNameSaved(true)
    setTimeout(() => setNameSaved(false), 2000)
  }

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault()
    setPwError('')
    if (newPw !== confirmPw) { setPwError('As senhas não coincidem.'); return }
    if (newPw.length < 6) { setPwError('A nova senha deve ter ao menos 6 caracteres.'); return }
    setSavingPw(true)
    const { error } = await supabase.auth.updateUser({ password: newPw })
    setSavingPw(false)
    if (error) { setPwError(error.message); return }
    setPwSaved(true)
    setNewPw(''); setConfirmPw('')
    setTimeout(() => setPwSaved(false), 3000)
  }

  return (
    <div className="space-y-5">
      {/* Display name */}
      <form onSubmit={handleSaveName} className="space-y-3">
        <Field label="Nome de exibição">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </Field>
        <div className="flex items-center gap-3">
          <SaveButton loading={savingName} />
          {nameSaved && <span className="text-xs text-emerald-400 flex items-center gap-1"><Check className="w-3 h-3" /> Salvo</span>}
        </div>
      </form>

      <div className="border-t border-slate-800" />

      {/* Email (read-only) */}
      <Field label="E-mail">
        <p className="text-sm text-slate-400">{user?.email}</p>
      </Field>

      <div className="border-t border-slate-800" />

      {/* Password change */}
      <form onSubmit={handleChangePassword} className="space-y-3">
        <p className="text-xs font-medium text-slate-400">Alterar senha</p>
        <Field label="Nova senha">
          <input
            type="password"
            value={newPw}
            onChange={e => setNewPw(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </Field>
        <Field label="Confirmar nova senha">
          <input
            type="password"
            value={confirmPw}
            onChange={e => setConfirmPw(e.target.value)}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </Field>
        {pwError && <p className="text-xs text-red-400">{pwError}</p>}
        <div className="flex items-center gap-3">
          <SaveButton loading={savingPw} label="Alterar senha" />
          {pwSaved && <span className="text-xs text-emerald-400 flex items-center gap-1"><Check className="w-3 h-3" /> Senha alterada</span>}
        </div>
      </form>
    </div>
  )
}

// ─── Household section ────────────────────────────────────────────────────────
function HouseholdSection({ household }: { household: any }) {
  const [name, setName] = useState(household?.name ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteSent, setInviteSent] = useState(false)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState('')

  async function handleSaveName(e: FormEvent) {
    e.preventDefault()
    if (!household) return
    setSaving(true)
    await supabase.from('households').update({ name }).eq('id', household.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleInvite(e: FormEvent) {
    e.preventDefault()
    if (!inviteEmail || !household) return
    setInviteError('')
    setInviteLoading(true)
    // Send OTP magic link to the email with the household ID as metadata
    const { error } = await supabase.auth.signInWithOtp({
      email: inviteEmail,
      options: {
        data: { pending_household_id: household.id },
        emailRedirectTo: `${window.location.origin}/auth/cadastro?household=${household.id}`,
      },
    })
    setInviteLoading(false)
    if (error) { setInviteError(error.message); return }
    setInviteSent(true)
    setInviteEmail('')
    setTimeout(() => setInviteSent(false), 4000)
  }

  return (
    <div className="space-y-5">
      <form onSubmit={handleSaveName} className="space-y-3">
        <Field label="Nome da residência">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </Field>
        <div className="flex items-center gap-3">
          <SaveButton loading={saving} />
          {saved && <span className="text-xs text-emerald-400 flex items-center gap-1"><Check className="w-3 h-3" /> Salvo</span>}
        </div>
      </form>

      <div className="border-t border-slate-800" />

      {/* Invite */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-slate-400">Convidar membro por e-mail</p>
        <form onSubmit={handleInvite} className="flex gap-2">
          <input
            type="email"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            placeholder="email@exemplo.com"
            className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <button
            type="submit"
            disabled={inviteLoading || !inviteEmail}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors whitespace-nowrap"
          >
            {inviteLoading ? 'Enviando...' : 'Convidar'}
          </button>
        </form>
        {inviteError && <p className="text-xs text-red-400">{inviteError}</p>}
        {inviteSent && (
          <p className="text-xs text-emerald-400 flex items-center gap-1">
            <Check className="w-3 h-3" /> Convite enviado para {inviteEmail || 'o e-mail informado'}
          </p>
        )}

        {/* Share code */}
        {household && <HouseholdCodeShare householdId={household.id} />}
      </div>
    </div>
  )
}

function HouseholdCodeShare({ householdId }: { householdId: string }) {
  const [copied, setCopied] = useState(false)
  const link = `${window.location.origin}/auth/cadastro?household=${householdId}`

  async function handleCopy() {
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mt-1">
      <p className="text-xs text-slate-500 mb-1.5">Ou compartilhe o link de convite:</p>
      <button
        onClick={handleCopy}
        className={clsx(
          'flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-colors w-full',
          copied
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
        )}
      >
        {copied ? <Check className="w-3 h-3 shrink-0" /> : <Copy className="w-3 h-3 shrink-0" />}
        <span className="truncate flex-1 text-left">{link}</span>
      </button>
    </div>
  )
}

// ─── Financial Profiles section ───────────────────────────────────────────────
function ProfilesSection({ financialProfiles, household }: { financialProfiles: any[]; household: any }) {
  const [editingProfile, setEditingProfile] = useState<any | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  async function handleSave(data: { name: string; icon: string; color: string; type: 'personal' | 'business' }) {
    if (editingProfile) {
      await supabase.from('financial_profiles').update(data).eq('id', editingProfile.id)
    } else if (household) {
      await supabase.from('financial_profiles').insert({ ...data, household_id: household.id })
    }
    setEditingProfile(null)
    setCreating(false)
    // Reload page to refresh auth context
    window.location.reload()
  }

  async function handleDelete(id: string) {
    await supabase.from('financial_profiles').delete().eq('id', id)
    setDeleteConfirm(null)
    window.location.reload()
  }

  return (
    <div className="space-y-3">
      {financialProfiles.map(fp => (
        <div key={fp.id} className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg border border-slate-700">
          <span className="text-xl leading-none">{fp.icon ?? '💰'}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{fp.name}</p>
            <p className="text-xs text-slate-500">{fp.type === 'personal' ? 'Pessoal' : 'Empresarial'}</p>
          </div>
          {fp.color && (
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: fp.color }} />
          )}
          <button
            onClick={() => { setEditingProfile(fp); setCreating(false) }}
            className="p-1.5 text-slate-500 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          {financialProfiles.length > 1 && (
            <button
              onClick={() => setDeleteConfirm(fp.id)}
              className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-700 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ))}

      {/* Add new profile */}
      <button
        onClick={() => { setCreating(true); setEditingProfile(null) }}
        className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg border border-dashed border-slate-700 text-slate-500 hover:text-white hover:border-slate-600 text-sm transition-colors"
      >
        <Plus className="w-4 h-4" />
        Novo perfil financeiro
      </button>

      {/* Edit / Create modal */}
      <Modal
        open={!!(editingProfile || creating)}
        onClose={() => { setEditingProfile(null); setCreating(false) }}
        title={editingProfile ? 'Editar perfil' : 'Novo perfil'}
        size="sm"
      >
        <FinancialProfileForm
          initial={editingProfile}
          onSave={handleSave}
          onCancel={() => { setEditingProfile(null); setCreating(false) }}
        />
      </Modal>

      {/* Delete confirm modal */}
      <Modal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Excluir perfil"
        size="sm"
      >
        <div className="p-5">
          <p className="text-slate-300 text-sm mb-5">
            Tem certeza? Isso irá remover o perfil e todos os dados associados (contas, lançamentos, metas).
          </p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-lg text-sm">Cancelar</button>
            <button onClick={() => handleDelete(deleteConfirm!)} className="flex-1 py-2 bg-red-500 hover:bg-red-400 text-white rounded-lg text-sm">Excluir</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function FinancialProfileForm({ initial, onSave, onCancel }: {
  initial?: any
  onSave: (data: { name: string; icon: string; color: string; type: 'personal' | 'business' }) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [icon, setIcon] = useState(initial?.icon ?? '💰')
  const [color, setColor] = useState(initial?.color ?? '#10b981')
  const [type, setType] = useState<'personal' | 'business'>(initial?.type ?? 'personal')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    await onSave({ name: name.trim(), icon, color, type })
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="p-5 space-y-4">
      <Field label="Nome">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          required
          placeholder="Ex: Pessoal, MEI, Empresa..."
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </Field>

      <Field label="Tipo">
        <div className="flex rounded-lg border border-slate-700 overflow-hidden">
          {(['personal', 'business'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={clsx(
                'flex-1 py-2 text-sm transition-colors',
                type === t ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
              )}
            >
              {t === 'personal' ? 'Pessoal' : 'Empresarial'}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Ícone">
        <div className="flex flex-wrap gap-2">
          {FP_ICONS.map(i => (
            <button
              key={i}
              type="button"
              onClick={() => setIcon(i)}
              className={clsx(
                'w-9 h-9 rounded-lg border text-lg flex items-center justify-center transition-colors',
                icon === i ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-700 hover:border-slate-500'
              )}
            >
              {i}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Cor">
        <div className="flex flex-wrap gap-2">
          {FP_COLORS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={clsx(
                'w-7 h-7 rounded-full border-2 transition-all',
                color === c ? 'border-white scale-110' : 'border-transparent'
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </Field>

      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onCancel} className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-lg text-sm">
          Cancelar
        </button>
        <SaveButton loading={saving} label={initial ? 'Salvar' : 'Criar'} />
      </div>
    </form>
  )
}

// ─── Appearance section ───────────────────────────────────────────────────────
function AppearanceSection() {
  const [prefs, setPrefs] = useState(getStoredTheme())

  function handleMode(mode: ThemeMode) {
    const next = { ...prefs, mode }
    setPrefs(next)
    applyTheme(next)
  }

  function handleAccent(accent: ThemeAccent) {
    const next = { ...prefs, accent }
    setPrefs(next)
    applyTheme(next)
  }

  return (
    <div className="space-y-5">
      {/* Light / dark toggle */}
      <div>
        <p className="text-xs text-slate-500 mb-2">Modo</p>
        <div className="flex rounded-lg border border-slate-700 overflow-hidden">
          {(['dark', 'light'] as ThemeMode[]).map(m => (
            <button
              key={m}
              onClick={() => handleMode(m)}
              className={clsx(
                'flex-1 flex items-center justify-center gap-2 py-2.5 text-sm transition-colors',
                prefs.mode === m ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
              )}
            >
              <span className="text-base">{m === 'dark' ? '🌙' : '☀️'}</span>
              {m === 'dark' ? 'Escuro' : 'Claro'}
            </button>
          ))}
        </div>
      </div>

      {/* Accent color */}
      <div>
        <p className="text-xs text-slate-500 mb-2">Cor de destaque</p>
        <div className="grid grid-cols-2 gap-2">
          {ACCENT_OPTIONS.map(({ key, label, dot }) => (
            <button
              key={key}
              onClick={() => handleAccent(key)}
              className={clsx(
                'flex items-center gap-3 p-3 rounded-xl border text-sm transition-colors text-left',
                prefs.accent === key
                  ? 'border-slate-500 bg-slate-800 text-white'
                  : 'border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
              )}
            >
              <div className={clsx('w-4 h-4 rounded-full shrink-0', dot)} />
              <span className="text-xs font-medium">{label}</span>
              {prefs.accent === key && <Check className="w-3.5 h-3.5 ml-auto text-emerald-400" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
