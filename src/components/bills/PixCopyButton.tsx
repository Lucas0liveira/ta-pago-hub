import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { clsx } from 'clsx'
import { PIX_KEY_LABELS } from '../../lib/formatters'
import type { PixKeyType } from '../../types/database'

interface PixCopyButtonProps {
  pixKey: string
  pixKeyType: PixKeyType | null
  className?: string
}

export function PixCopyButton({ pixKey, pixKeyType, className }: PixCopyButtonProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(pixKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      title="Copiar chave PIX"
      className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all',
        copied
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600',
        className
      )}
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {pixKeyType ? PIX_KEY_LABELS[pixKeyType] : 'PIX'}
    </button>
  )
}
