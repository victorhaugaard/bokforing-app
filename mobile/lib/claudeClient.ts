import Anthropic from '@anthropic-ai/sdk'
import { API_BASE_URL, API_SECRET_KEY, ANTHROPIC_API_KEY } from '../constants'

const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY, dangerouslyAllowBrowser: true })

// ─── API-hjälpfunktion ────────────────────────────────────────────────────────

async function callApi(path: string, method = 'GET', body?: unknown) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_SECRET_KEY}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`)
  return res.json()
}

// ─── Verktyg som Claude kan använda ──────────────────────────────────────────

const tools: Anthropic.Tool[] = [
  {
    name: 'add_transaction',
    description:
      'Skapar en bokföringsverifikation med dubbel bokföring. Används när användaren vill bokföra en betalning, återbetalning, kostnad, intäkt eller annan transaktion. Debet och kredit måste balansera.',
    input_schema: {
      type: 'object' as const,
      properties: {
        date: { type: 'string', description: 'Datum i format YYYY-MM-DD' },
        description: { type: 'string', description: 'Beskrivning av verifikationen' },
        entries: {
          type: 'array',
          description: 'Konteringsrader — summan av debet måste = summan av kredit',
          items: {
            type: 'object',
            properties: {
              accountNumber: { type: 'number', description: 'BAS-kontonummer (t.ex. 1930, 2393)' },
              debit: { type: 'number', description: 'Debetbelopp i SEK (0 om kredit)' },
              credit: { type: 'number', description: 'Kreditbelopp i SEK (0 om debet)' },
            },
            required: ['accountNumber', 'debit', 'credit'],
          },
        },
      },
      required: ['date', 'description', 'entries'],
    },
  },
  {
    name: 'get_accounts',
    description: 'Hämtar kontoplanen (BAS-konton). Används för att slå upp kontonummer.',
    input_schema: {
      type: 'object' as const,
      properties: {
        search: { type: 'string', description: 'Fritext för att filtrera konton (valfritt)' },
      },
    },
  },
  {
    name: 'get_recent_transactions',
    description: 'Hämtar de senaste verifikationerna. Används för att visa historik.',
    input_schema: {
      type: 'object' as const,
      properties: {
        limit: { type: 'number', description: 'Antal att hämta (standard 10)' },
      },
    },
  },
  {
    name: 'get_statistics',
    description:
      'Hämtar ekonomisk statistik — intäkter, kostnader, resultat och kontosaldon. Bra för snabb ekonomisk överblick.',
    input_schema: {
      type: 'object' as const,
      properties: {},
    },
  },
]

// ─── Verktygsexekvering ───────────────────────────────────────────────────────

async function executeTool(name: string, input: Record<string, unknown>): Promise<string> {
  try {
    switch (name) {
      case 'add_transaction': {
        const { date, description, entries } = input as {
          date: string
          description: string
          entries: { accountNumber: number; debit: number; credit: number }[]
        }
        // Slå upp konto-ID:n från kontonummer
        const accounts = await callApi('/api/accounts')
        const accountMap = new Map(accounts.map((a: { number: number; id: number }) => [a.number, a.id]))

        const resolvedEntries = entries.map((e) => {
          const accountId = accountMap.get(e.accountNumber)
          if (!accountId) throw new Error(`Konto ${e.accountNumber} hittades inte`)
          return { accountId, debit: e.debit, credit: e.credit }
        })

        const result = await callApi('/api/transactions', 'POST', {
          date,
          description,
          entries: resolvedEntries,
        })
        return `✅ Verifikation skapad (ID: ${result.id}) — "${description}" ${date}`
      }

      case 'get_accounts': {
        const accounts = await callApi('/api/accounts')
        const filtered = input.search
          ? accounts.filter(
              (a: { number: number; name: string }) =>
                a.name.toLowerCase().includes((input.search as string).toLowerCase()) ||
                String(a.number).includes(input.search as string)
            )
          : accounts.slice(0, 30)
        return filtered
          .map((a: { number: number; name: string; type: string }) => `${a.number} – ${a.name} (${a.type})`)
          .join('\n')
      }

      case 'get_recent_transactions': {
        const limit = (input.limit as number) || 10
        const data = await callApi('/api/transactions')
        const recent = data.slice(0, limit)
        return recent
          .map(
            (t: { id: number; date: string; description: string; entries: { debit: number; credit: number }[] }) =>
              `${new Date(t.date).toLocaleDateString('sv-SE')} — ${t.description} (${t.entries
                .filter((e) => e.debit > 0)
                .reduce((s: number, e: { debit: number }) => s + e.debit, 0)} kr)`
          )
          .join('\n')
      }

      case 'get_statistics': {
        const stats = await callApi('/api/statistics')
        return JSON.stringify(stats, null, 2)
      }

      default:
        return `Okänt verktyg: ${name}`
    }
  } catch (err) {
    return `Fel: ${err instanceof Error ? err.message : String(err)}`
  }
}

// ─── Systemmeddelande ─────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Du är en bokföringsassistent för Script Collective AB. Du hjälper ägaren Victor att:
- Bokföra transaktioner via dubbel bokföring (BAS-kontoplanen)
- Se kontosaldon och ekonomisk statistik
- Förstå hur transaktioner ska konteras

Viktiga konton att känna till:
- 1930: Bankkonto
- 2393: Lån från närstående (ägarlån, långfristigt)
- 2893: Kortfristiga skulder till närstående
- 8410: Räntekostnader

När Victor beskriver en transaktion på naturligt språk, skapa rätt verifikation direkt utan att fråga i onödan.
Bekräfta alltid vad du har bokfört och vilka konton som användes.
Svara alltid på svenska.`

// ─── Huvudfunktion: skicka meddelande ────────────────────────────────────────

export type Message = { role: 'user' | 'assistant'; content: string }

export async function sendMessage(
  history: Message[],
  userMessage: string,
  onToolCall?: (name: string) => void
): Promise<string> {
  const messages: Anthropic.MessageParam[] = history.map((m) => ({
    role: m.role,
    content: m.content,
  }))
  messages.push({ role: 'user', content: userMessage })

  let response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    tools,
    messages,
  })

  // Agentic loop — Claude kan kalla verktyg flera gånger
  while (response.stop_reason === 'tool_use') {
    const toolUseBlocks = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
    const toolResults: Anthropic.ToolResultBlockParam[] = []

    for (const block of toolUseBlocks) {
      onToolCall?.(block.name)
      const result = await executeTool(block.name, block.input as Record<string, unknown>)
      toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result })
    }

    messages.push({ role: 'assistant', content: response.content })
    messages.push({ role: 'user', content: toolResults })

    response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      tools,
      messages,
    })
  }

  const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text')
  return textBlock?.text ?? '(inget svar)'
}
