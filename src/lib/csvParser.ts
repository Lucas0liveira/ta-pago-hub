import type { BankTransaction } from '../types/database'

type RawTransaction = Omit<BankTransaction, 'id' | 'import_id' | 'matched_bill_entry_id' | 'category_id' | 'is_reconciled'>

// Detect bank format from headers
type BankFormat = 'nubank' | 'inter' | 'itau' | 'bradesco' | 'bb' | 'generic'

function detectFormat(headers: string[]): BankFormat {
  const h = headers.map(h => h.toLowerCase().trim())
  if (h.includes('categoria') && h.includes('título')) return 'nubank'
  if (h.includes('histórico') && h.includes('data')) return 'itau'
  if (h.includes('lançamento') || h.includes('lançamentos')) return 'bradesco'
  if (h.includes('dependência origem') || h.includes('número do documento')) return 'bb'
  if (h.includes('descrição') && h.includes('valor')) return 'inter'
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
  const idx = (name: string) => headers.findIndex(h => h.toLowerCase().trim().includes(name.toLowerCase()))

  switch (format) {
    case 'nubank': {
      // Date, Category, Title, Amount
      const dateCol = idx('data')
      const descCol = idx('título')
      const amtCol = idx('valor')
      const { amount, type } = parseBRAmount(get(amtCol))
      return {
        date: parseBRDate(get(dateCol)),
        description: get(descCol),
        amount,
        type,
      }
    }

    case 'inter': {
      // Data Lançamento, Descrição, Valor, Tipo
      const dateCol = idx('data')
      const descCol = idx('descrição')
      const amtCol = idx('valor')
      const typeCol = idx('tipo')
      const rawType = get(typeCol).toLowerCase()
      return {
        date: parseBRDate(get(dateCol)),
        description: get(descCol),
        amount: Math.abs(parseFloat(get(amtCol).replace(/[R$\s.]/g, '').replace(',', '.')) || 0),
        type: rawType.includes('créd') ? 'credit' : 'debit',
      }
    }

    default: {
      // Generic: try common column names
      const dateCol = idx('data')
      const descCol = idx('descrição') >= 0 ? idx('descrição') : idx('histórico')
      const amtCol = idx('valor') >= 0 ? idx('valor') : idx('amount')

      const rawAmt = get(amtCol)
      const { amount, type } = parseBRAmount(rawAmt)

      return {
        date: parseBRDate(get(dateCol)),
        description: get(descCol),
        amount,
        type,
      }
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
