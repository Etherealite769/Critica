// Inspector Crit's sequence analysis for Logic Thread (Forensic Textual Analysis).
// Compares the cadet's chain against the correct order and explains misplaced cards
// through the signal words they open with ("First", "Meanwhile", "Finally", ...).

export interface SequenceBlock { block_id: string; text: string }

export interface SequenceVerdict {
  /** Cards sitting in their correct slot (null when the answer key is unavailable). */
  correctSlots: number | null
  total: number
  /** Up to three short notes in Inspector Crit's voice. */
  notes: string[]
}

type Role = 'opening' | 'closing' | 'simultaneous' | 'continuing' | 'contrast'

const SIGNALS: { role: Role; re: RegExp }[] = [
  { role: 'opening',      re: /^(first(ly)?|to begin( with)?|initially|in the beginning|at first|originally|once upon a time)\b/i },
  { role: 'closing',      re: /^(finally|lastly|in conclusion|to conclude|eventually|in the end|ultimately|at last|overall|in summary|as a result)\b/i },
  { role: 'simultaneous', re: /^(meanwhile|at the same time|simultaneously|in the meantime|while)\b/i },
  { role: 'continuing',   re: /^(next|then|after(wards?)?|later|subsequently|second(ly)?|third(ly)?|following (this|that)|soon after|by then|before long)\b/i },
  { role: 'contrast',     re: /^(however|but|on the other hand|in contrast|nevertheless|yet)\b/i },
]

/** The signal phrase a card opens with, if any. */
function signalOf(text: string): { role: Role; word: string } | null {
  const t = text.trim().replace(/^["“'(]+/, '')
  for (const s of SIGNALS) {
    const m = t.match(s.re)
    if (m) return { role: s.role, word: m[0].replace(/^\w/, c => c.toUpperCase()) }
  }
  return null
}

/** First few words of a card, for quoting it back to the cadet. */
function snippet(text: string, words = 6): string {
  const parts = text.trim().split(/\s+/)
  return parts.slice(0, words).join(' ').replace(/[,.;:]$/, '') + (parts.length > words ? '…' : '')
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

export function analyzeSequence(
  chain: string[],
  blocks: SequenceBlock[],
  correct: string[] | null | undefined,
): SequenceVerdict {
  const text = (id: string) => blocks.find(b => b.block_id === id)?.text ?? ''
  const total = blocks.length

  // No answer key (legacy endpoint): reason from signal words alone
  if (!correct || correct.length !== chain.length) {
    const notes: string[] = []
    chain.forEach((id, i) => {
      const sig = signalOf(text(id))
      if (!sig) return
      if (sig.role === 'closing' && i < chain.length - 1)
        notes.push(`“${snippet(text(id))}” opens with “${sig.word}” — a closing signal, yet you filed it ${ordinal(i + 1)}.`)
      if (sig.role === 'opening' && i > 0)
        notes.push(`“${snippet(text(id))}” opens with “${sig.word}” — that card starts the chain, not the ${ordinal(i + 1)} slot.`)
      if ((sig.role === 'simultaneous' || sig.role === 'continuing') && i === 0)
        notes.push(`“${sig.word}” points back to an earlier event, so “${snippet(text(id))}” can't open the sequence.`)
    })
    if (notes.length === 0)
      notes.push('The thread breaks somewhere. Trace each card to the event it depends on, and look for time markers such as “then”, “meanwhile” and “finally”.')
    return { correctSlots: null, total, notes: notes.slice(0, 3) }
  }

  const correctSlots = chain.filter((id, i) => id === correct[i]).length
  const notes: string[] = []

  chain.forEach((id, i) => {
    if (id === correct[i] || notes.length >= 3) return
    const rightSlot = correct.indexOf(id)
    const quote = `“${snippet(text(id))}”`
    const sig = signalOf(text(id))
    const prevId = rightSlot > 0 ? correct[rightSlot - 1] : null

    if (sig?.role === 'closing') {
      notes.push(`${quote} opens with “${sig.word}” — a closing signal. It belongs ${rightSlot === total - 1 ? 'at the end of the chain' : `in slot ${rightSlot + 1}`}, not slot ${i + 1}.`)
    } else if (sig?.role === 'opening') {
      notes.push(`${quote} opens with “${sig.word}”, so it starts the sequence — move it to slot ${rightSlot + 1}.`)
    } else if (sig?.role === 'simultaneous' && prevId) {
      notes.push(`${quote} happens at the same time as “${snippet(text(prevId), 5)}” — “${sig.word}” ties the two together, so place it right after that card.`)
    } else if ((sig?.role === 'continuing' || sig?.role === 'contrast') && prevId) {
      notes.push(`“${sig.word}” continues from “${snippet(text(prevId), 5)}” — ${quote} should follow that card.`)
    } else {
      notes.push(`${quote} belongs in slot ${rightSlot + 1}, not slot ${i + 1}. Ask which event has to happen before it.`)
    }
  })

  return { correctSlots, total, notes }
}
