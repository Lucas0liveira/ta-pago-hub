import { useState, useRef, useCallback } from 'react'
import { Upload, FileText, ChevronDown, ChevronUp, CheckCircle2, Circle, AlertCircle } from 'lucide-react'
import { clsx } from 'clsx'
import { useBankImports, useBankTransactions, useImportTransactions, useMatchTransaction } from '../hooks/useBankImports'
import { useBillEntries } from '../hooks/useBillEntries'
import { useBills } from '../hooks/useBills'
import { parseCSV, parseOFX } from '../lib/csvParser'
import { formatCurrency, formatDate } from '../lib/formatters'
import type { BankTransaction } from '../types/database'

export default function ImportsPage() {
  const { data: imports = [], isLoading } = useBankImports()
  const importTransactions = useImportTransactions()

  const [dragging, setDragging] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [preview, setPreview] = useState<{ name: string; rows: ReturnType<typeof parseCSV> } | null>(null)
  const [selectedImportId, setSelectedImportId] = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)

  async function processFile(file: File) {
    setParsing(true)
    setParseError(null)
    setPreview(null)

    try {
      const text = await file.text()
      const ext = file.name.split('.').pop()?.toLowerCase()

      const rows = ext === 'ofx' ? parseOFX(text) : parseCSV(text)

      if (rows.length === 0) {
        setParseError('Não foi possível ler transações do arquivo. Verifique o formato.')
        return
      }

      setPreview({ name: file.name, rows })
    } catch {
      setParseError('Erro ao processar arquivo.')
    } finally {
      setParsing(false)
    }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [])

  async function confirmImport() {
    if (!preview) return
    const imp = await importTransactions.mutateAsync({
      fileName: preview.name,
      transactions: preview.rows,
    })
    setPreview(null)
    setSelectedImportId(imp.id)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Importar Extrato</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Suporta CSV e OFX — Nubank, Inter, Itaú, Bradesco, Banco do Brasil e outros
        </p>
      </div>

      {/* Upload zone */}
      {!preview && (
        <div className="mb-6">
          {/* Hidden file input */}
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.ofx"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = '' }}
          />

          {/* Mobile-first: big tap target button */}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={parsing}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={clsx(
              'w-full border-2 border-dashed rounded-2xl py-10 px-6 flex flex-col items-center justify-center transition-colors',
              dragging
                ? 'border-emerald-400 bg-emerald-500/5'
                : 'border-slate-700 hover:border-slate-500 bg-slate-900 active:bg-slate-800'
            )}
          >
            {parsing ? (
              <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
            ) : (
              <Upload className="w-10 h-10 text-slate-500 mb-3" />
            )}
            <p className="text-white font-semibold text-base mb-1">
              {parsing ? 'Processando...' : 'Selecionar arquivo'}
            </p>
            <p className="text-slate-500 text-sm text-center">
              {parsing ? '' : 'CSV ou OFX — exportado pelo app do banco'}
            </p>
            <p className="text-slate-600 text-xs mt-1 hidden sm:block">
              Ou arraste o arquivo aqui
            </p>
          </button>

          {parseError && (
            <div className="mt-3 flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {parseError}
            </div>
          )}
        </div>
      )}

      {/* Preview before confirm */}
      {preview && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl mb-6">
          <div className="p-4 border-b border-slate-800">
            <p className="text-white font-semibold text-sm truncate">{preview.name}</p>
            <p className="text-slate-400 text-xs mt-0.5">{preview.rows.length} transações encontradas</p>
          </div>

          {/* Transaction preview — card list (mobile) */}
          <div className="divide-y divide-slate-800/50 max-h-64 overflow-y-auto">
            {preview.rows.slice(0, 50).map((row, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-slate-200 text-xs font-medium truncate">{row.description}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{formatDate(row.date)}</p>
                </div>
                <span className={clsx('text-xs font-semibold shrink-0', row.type === 'credit' ? 'text-emerald-400' : 'text-red-400')}>
                  {row.type === 'debit' ? '-' : '+'}{formatCurrency(row.amount)}
                </span>
              </div>
            ))}
            {preview.rows.length > 50 && (
              <p className="text-center text-xs text-slate-500 py-3">
                ... e mais {preview.rows.length - 50} transações
              </p>
            )}
          </div>

          <div className="flex gap-3 p-4 border-t border-slate-800">
            <button
              onClick={() => setPreview(null)}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-medium rounded-lg text-sm transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={confirmImport}
              disabled={importTransactions.isPending}
              className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors"
            >
              {importTransactions.isPending ? 'Importando...' : 'Confirmar'}
            </button>
          </div>
        </div>
      )}

      {/* Import history */}
      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : imports.length > 0 ? (
        <div>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Importações</h2>
          <div className="space-y-2">
            {imports.map(imp => (
              <ImportAccordion
                key={imp.id}
                importRecord={imp}
                open={selectedImportId === imp.id}
                onToggle={() => setSelectedImportId(selectedImportId === imp.id ? null : imp.id)}
              />
            ))}
          </div>
        </div>
      ) : !preview && (
        <div className="text-center py-10 text-slate-500 text-sm">
          Nenhum extrato importado ainda.
        </div>
      )}
    </div>
  )
}

function ImportAccordion({ importRecord, open, onToggle }: {
  importRecord: { id: string; file_name: string; imported_at: string; row_count: number }
  open: boolean
  onToggle: () => void
}) {
  const { data: transactions = [], isLoading } = useBankTransactions(open ? importRecord.id : null)
  const { data: bills = [] } = useBills()
  const currentYear = new Date().getFullYear()
  const { data: entries = [] } = useBillEntries(currentYear)
  const matchTransaction = useMatchTransaction()

  const reconciled = transactions.filter(t => t.is_reconciled).length

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-slate-800/50 transition-colors"
      >
        <FileText className="w-5 h-5 text-slate-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium text-sm">{importRecord.file_name}</p>
          <p className="text-slate-500 text-xs mt-0.5">
            {formatDate(importRecord.imported_at)} · {importRecord.row_count} transações
            {transactions.length > 0 && ` · ${reconciled}/${transactions.length} reconciliadas`}
          </p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
      </button>

      {open && (
        <div className="border-t border-slate-800 divide-y divide-slate-800/50 max-h-[28rem] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : transactions.map(tx => (
            <TransactionRow
              key={tx.id}
              transaction={tx}
              bills={bills}
              entries={entries}
              onMatch={async (entryId) => {
                await matchTransaction.mutateAsync({
                  transactionId: tx.id,
                  billEntryId: entryId,
                  importId: importRecord.id,
                })
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function TransactionRow({ transaction, bills, entries, onMatch }: {
  transaction: BankTransaction
  bills: ReturnType<typeof useBills>['data']
  entries: ReturnType<typeof useBillEntries>['data']
  onMatch: (entryId: string | null) => Promise<void>
}) {
  const now = new Date()

  const desc = transaction.description.toLowerCase()
  const suggestions = (bills ?? []).filter(b =>
    b.type === 'expense' && b.name.toLowerCase().split(' ').some(word => word.length > 3 && desc.includes(word))
  ).slice(0, 3)

  const matchedEntry = entries?.find(e => e.id === transaction.matched_bill_entry_id)
  const matchedBill = matchedEntry ? bills?.find(b => b.id === matchedEntry.bill_id) : null

  return (
    <div className={clsx('px-4 py-3 space-y-2', transaction.is_reconciled && 'opacity-60')}>
      {/* Top row: description + amount + reconcile indicator */}
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-slate-200 text-xs font-medium truncate">{transaction.description}</p>
          <p className="text-slate-500 text-xs mt-0.5">{formatDate(transaction.date)}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={clsx('text-xs font-semibold', transaction.type === 'credit' ? 'text-emerald-400' : 'text-red-400')}>
            {transaction.type === 'debit' ? '-' : '+'}{formatCurrency(transaction.amount)}
          </span>
          {transaction.is_reconciled
            ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            : <Circle className="w-4 h-4 text-slate-700" />
          }
        </div>
      </div>

      {/* Match selector */}
      {transaction.is_reconciled ? (
        <p className="text-xs text-emerald-400">Vinculada: {matchedBill?.name ?? '—'}</p>
      ) : (
        <select
          defaultValue=""
          onChange={e => onMatch(e.target.value || null)}
          className="w-full text-xs bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          <option value="">Vincular à conta...</option>
          {suggestions.length > 0 && (
            <optgroup label="Sugestões">
              {suggestions.map(b => {
                const entry = entries?.find(e => e.bill_id === b.id && e.month === now.getMonth() + 1 && e.year === now.getFullYear())
                return <option key={b.id} value={entry?.id ?? ''}>{b.name}</option>
              })}
            </optgroup>
          )}
          <optgroup label="Todas as contas">
            {(bills ?? []).filter(b => b.type === 'expense').map(b => {
              const entry = entries?.find(e => e.bill_id === b.id && e.month === now.getMonth() + 1 && e.year === now.getFullYear())
              return <option key={b.id} value={entry?.id ?? ''}>{b.name}</option>
            })}
          </optgroup>
        </select>
      )}
    </div>
  )
}
