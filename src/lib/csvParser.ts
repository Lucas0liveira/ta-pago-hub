import type { BankTransaction } from '../types/database'

type RawTransaction = Omit<BankTransaction, 'id' | 'import_id' | 'matched_bill_entry_id' | 'category_id' | 'is_reconciled'>

// Detect bank format from headers
type BankFormat = 'nubank' | 'inter' | 'itau' | 'bradesco' | 'bb' | 'generic'

// Normalise: strip accents, lowercase, trim — so DESCRICAO == descrição == Descrição
function norm(s: string) {
  return s.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function detectFormat(headers: string[]): BankFormat {
  const h = headers.map(norm)
  if (h.includes('categoria') && (h.includes('titulo') || h.includes('title'))) return 'nubank'
  if (h.includes('historico') && h.includes('data')) return 'itau'
  if (h.includes('lancamento') || h.includes('lancamentos')) return 'bradesco'
  if (h.includes('dependencia origem') || h.includes('numero do documento')) return 'bb'
  // Inter: "Data Lançamento / Descrição / Valor / Tipo" — requires a 'tipo' column
  // AND description must use the accented 'descrição' spelling (Inter exports UTF-8)
  // We deliberately exclude files that have a UUID/transaction-code first column
  if (h.includes('descricao') && h.includes('valor') && h.includes('tipo') && !h.some(c => c.includes('codigo') || c.includes('transacao'))) return 'inter'
  return 'generic'
}

function parseBRAmount(raw: string): { amount: number; type: 'credit' | 'debit' } {
  const clean = raw.replace(/[R$\s.]/g, '').replace(',', '.')
  const num = parseFloat(clean)
  if (isNaN(num)) return { amount: 0, type: 'debit' }
  return { amount: Math.abs(num), type: num >= 0 ? 'credit' : 'debit' }
}

function parseBRDate(str: string): string {
  const [day, month, year] = str.trim().split('/')
  return `${year}-${month}-${day}` // → "2026-03-01" (ISO, safe for new Date())
}

function parseCSVLine(line: string, delimiter = ','): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

export function parseCSV(content: string): RawTransaction[] {
  const lines = content.split('\n').filter(l => l.trim())
  if (lines.length < 2) return []
  
  // Some banks add metadata before headers; find the header row
  let headerIdx = 0
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const lower = lines[i].toLowerCase()
    if (lower.includes('data') && (lower.includes('valor') || lower.includes('débito') || lower.includes('crédito'))) {
      headerIdx = i
      break
    }
  }
  
  const delimiter = lines[0].includes(';') ? ';' : ','
  const headers = parseCSVLine(lines[headerIdx], delimiter)
  const format = detectFormat(headers)
  const rows = lines.slice(headerIdx + 1)

  return rows.flatMap(line => {
    if (!line.trim()) return []
    const cols = parseCSVLine(line, delimiter)
    const get = (idx: number) => cols[idx]?.trim() ?? ''

    try {
      return [parseRow(headers, cols, format, get)]
    } catch {
      return []
    }
  }).filter(t => t.amount > 0)
}

function parseRow(
  headers: string[],
  _cols: string[],
  format: BankFormat,
  get: (i: number) => string
): RawTransaction {
  // Match by normalised name (strips accents, lowercase)
  const idx = (name: string) => headers.findIndex(h => norm(h).includes(norm(name)))
  // Try multiple column name candidates, return first match
  const idxAny = (...names: string[]) => {
    for (const n of names) { const i = idx(n); if (i >= 0) return i }
    return -1
  }

  switch (format) {
    case 'nubank': {
      const dateCol = idx('data')
      const descCol = idxAny('titulo', 'title', 'descricao', 'descr')
      const amtCol  = idx('valor')
      const { amount, type } = parseBRAmount(get(amtCol))
      return { date: parseBRDate(get(dateCol)), description: get(descCol), amount, type }
    }

    case 'inter': {
      const dateCol = idx('data')
      const descCol = idxAny('descricao', 'descr', 'historico')
      const amtCol  = idx('valor')
      const typeCol = idx('tipo')
      const rawAmt  = get(amtCol).replace(/[R$\s.]/g, '').replace(',', '.')
      const num     = parseFloat(rawAmt)
      const rawType = get(typeCol).toLowerCase()
      // Prefer TIPO column; fall back to amount sign if TIPO is ambiguous
      const type: 'credit' | 'debit' =
        rawType.includes('cred') ? 'credit' :
        rawType.includes('deb')  ? 'debit'  :
        !isNaN(num) ? (num >= 0 ? 'credit' : 'debit') : 'debit'
      return {
        date: parseBRDate(get(dateCol)),
        description: get(descCol),
        amount: Math.abs(num) || 0,
        type,
      }
    }

    default: {
      const dateCol = idx('data')
      const descCol = idxAny('descricao', 'descr', 'historico', 'lancamento', 'memo')
      const amtCol  = idxAny('valor', 'amount', 'debito', 'credito')
      const { amount, type } = parseBRAmount(get(amtCol))
      return { date: parseBRDate(get(dateCol)), description: get(descCol), amount, type }
    }
  }
}

// OFX parser (basic)
export function parseOFX(content: string): RawTransaction[] {
  const transactions: RawTransaction[] = []
  const stmtTrn = content.match(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi) ?? []

  for (const block of stmtTrn) {
    const get = (tag: string) => {
      const m = block.match(new RegExp(`<${tag}>([^<]+)`, 'i'))
      return m?.[1]?.trim() ?? ''
    }

    const trnType = get('TRNTYPE').toLowerCase()
    const dtPosted = get('DTPOSTED')
    const name = get('NAME') || get('MEMO')
    const rawAmt = get('TRNAMT')

    // OFX dates: YYYYMMDD
    const date = dtPosted.length >= 8
      ? `${dtPosted.slice(0, 4)}-${dtPosted.slice(4, 6)}-${dtPosted.slice(6, 8)}`
      : dtPosted

    const amount = Math.abs(parseFloat(rawAmt) || 0)
    const type: 'credit' | 'debit' =
      trnType === 'credit' || parseFloat(rawAmt) > 0 ? 'credit' : 'debit'

    if (amount > 0 && name) {
      transactions.push({ date, description: name, amount, type })
    }
  }

  return transactions
}
