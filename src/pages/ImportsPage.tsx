import { useState, useRef, useCallback } from 'react'
import { Upload, FileText, AlertCircle, Trash2, ChevronRight } from 'lucide-react'
import { clsx } from 'clsx'
import { Link } from 'react-router-dom'
import { useBankImports, useImportTransactions, useDeleteImport } from '../hooks/useBankImports'
import { parseCSV, parseOFX } from '../lib/csvParser'
import { formatDate } from '../lib/formatters'

export default function ImportsPage() {
  const { data: imports = [], isLoading } = useBankImports()
  const importTransactions = useImportTransactions()

  const [dragging, setDragging] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [preview, setPreview] = useState<{ name: string; rows: ReturnType<typeof parseCSV> } | null>(null)

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
    await importTransactions.mutateAsync({
      fileName: preview.name,
      transactions: preview.rows,
    })
    setPreview(null)
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
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.ofx"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = '' }}
          />

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

          <div className="divide-y divide-slate-800/50 max-h-64 overflow-y-auto">
            {preview.rows.slice(0, 50).map((row, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-slate-200 text-xs font-medium truncate">{row.description}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{formatDate(row.date)}</p>
                </div>
                <span className={clsx('text-xs font-semibold shrink-0', row.type === 'credit' ? 'text-green-400' : 'text-red-400')}>
                  {row.type === 'debit' ? '-' : '+'}{row.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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
              <ImportRow key={imp.id} importRecord={imp} />
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

function ImportRow({ importRecord }: {
  importRecord: { id: string; file_name: string; imported_at: string; row_count: number }
}) {
  const deleteImport = useDeleteImport()
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-3 px-4 py-3 group">
      <FileText className="w-5 h-5 text-slate-500 shrink-0" />

      <Link
        to={`/importar/${importRecord.id}/reconciliar`}
        className="flex-1 min-w-0 flex items-center gap-2 hover:opacity-80 transition-opacity"
      >
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium text-sm truncate">{importRecord.file_name}</p>
          <p className="text-slate-500 text-xs mt-0.5">
            {formatDate(importRecord.imported_at)} · {importRecord.row_count} transações
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
      </Link>

      {confirmDelete ? (
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => setConfirmDelete(false)} className="text-xs text-slate-400 hover:text-white px-2 py-1">
            Cancelar
          </button>
          <button
            onClick={() => deleteImport.mutateAsync(importRecord.id)}
            disabled={deleteImport.isPending}
            className="text-xs bg-red-500 hover:bg-red-400 text-white px-2 py-1 rounded-lg transition-colors"
          >
            {deleteImport.isPending ? '...' : 'Confirmar'}
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirmDelete(true)}
          className="p-1.5 text-slate-700 hover:text-red-400 transition-colors shrink-0"
          title="Excluir extrato"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
