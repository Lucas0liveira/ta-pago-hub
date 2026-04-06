import { useAuth } from '../../stores/authStore'
import { clsx } from 'clsx'

export default function MobileProfileBar() {
  const { financialProfiles, activeFinancialProfileId, setActiveFinancialProfile } = useAuth()

  if (financialProfiles.length === 0) return null

  const activeProfile = financialProfiles.find(fp => fp.id === activeFinancialProfileId)

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 border-b border-slate-800 overflow-x-auto">
      {financialProfiles.length === 1 ? (
        // Single profile — static indicator so the user always knows which profile is active
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 whitespace-nowrap">
          <span>{activeProfile?.icon ?? '💰'}</span>
          {activeProfile?.name}
        </div>
      ) : (
        financialProfiles.map(fp => (
          <button
            key={fp.id}
            onClick={() => setActiveFinancialProfile(fp.id)}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-colors border',
              fp.id === activeFinancialProfileId
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            )}
          >
            <span>{fp.icon ?? '💰'}</span>
            {fp.name}
          </button>
        ))
      )}
    </div>
  )
}
