// Printable documents (print, or "Save as PDF" from the print screen) for
// plans, templates and the ukugida book. Printed from a hidden frame so it
// also works in the installed app, where pop-up windows are blocked.
import { groupRowsByPhase, phaseLabel } from '../../shared/ceremonyList.js'

export const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const rand = (n) => (n == null || Number.isNaN(Number(n)) ? '' : `R${Math.round(Number(n)).toLocaleString('en-ZA')}`)
const today = () => new Date().toISOString().slice(0, 10)
const dateText = (value) => {
  const d = value ? new Date(value) : null
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' }) : ''
}

const STYLE = `body{font-family:Georgia,serif;color:#2b2620;margin:28px}h1{margin:0;font-size:26px}h2{font-size:14px;margin:18px 0 6px;color:#a3471a;text-transform:uppercase;letter-spacing:.08em;font-family:Arial,sans-serif}
.meta{margin:4px 0 0;color:#6b6258;font-family:Arial,sans-serif;font-size:12px}.box{display:inline-block;margin:12px 12px 0 0;padding:8px 12px;border:1px solid #ddd;border-radius:8px;font-family:Arial,sans-serif;font-size:12px}
.box b{display:block;font-size:16px}table{width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px}td{border-bottom:1px solid #eee;padding:5px 4px;vertical-align:top}
td.tick{width:18px}td.num{text-align:right;white-space:nowrap}.done{color:#6b6258;text-decoration:line-through}.foot{margin-top:24px;color:#6b6258;font-family:Arial,sans-serif;font-size:11px}`

const page = (title, body) => `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>${STYLE}</style></head><body>${body}<p class="foot">Made with i-Camagu · ${esc(today())}</p></body></html>`

// Stages in the order they happen (see groupRowsByPhase).
const byPhase = (rows) => groupRowsByPhase(rows).map((g) => [g.phase, g.rows])

// A ceremony plan: every step and purchase by stage, ticked or not, with
// the suggested price and what was paid, and the money totals.
export function planDocumentHtml({ title, typeName, ceremony = {}, rows = [], summary = {} }) {
  const real = rows.filter((r) => r.kind !== 'note')
  const done = real.filter((r) => r.done).length
  const facts = [typeName, dateText(ceremony.eventDate), ceremony.guestCount != null ? `${ceremony.guestCount} guests` : ''].filter(Boolean).join(' · ')
  const boxes = [
    ['Progress', `${done} of ${real.length} done`],
    ceremony.budgetZAR != null && ceremony.budgetZAR !== '' ? ['Budget', rand(ceremony.budgetZAR)] : null,
    summary.spent != null ? ['Paid so far', rand(summary.spent)] : null,
  ].filter(Boolean).map(([k, v]) => `<span class="box">${esc(k)}<b>${esc(v)}</b></span>`).join('')
  const sections = byPhase(real).map(([phase, list]) => `<h2>${esc(phaseLabel(phase))}</h2><table>${list.map((r) => `<tr class="${r.done ? 'done' : ''}"><td class="tick">${r.done ? '☑' : '☐'}</td><td>${esc(r.label)}${r.kind === 'cost' && r.quantity ? ` (${esc(r.quantity)})` : ''}</td><td class="num">${r.actual != null ? `paid ${esc(rand(r.actual))}` : esc(rand(r.suggested))}</td></tr>`).join('')}</table>`).join('')
  return page(title, `<h1>${esc(title)}</h1><p class="meta">${esc(facts)}</p>${boxes}${sections}`)
}

// A template: what to do and what to buy, by stage, with quantities and
// prices; nothing personal.
export function templateDocumentHtml({ title, typeName, items = [] }) {
  const sections = byPhase(items).map(([phase, list]) => `<h2>${esc(phaseLabel(phase))}</h2><table>${list.map((i) => `<tr><td class="tick">☐</td><td>${esc(i.label)}${i.kind === 'cost' && i.quantity ? ` (${esc(i.quantity)} ${esc(i.unit || '')})` : ''}</td><td class="num">${i.kind === 'cost' && i.unitCost ? esc(rand(Number(i.unitCost) * (Number(i.quantity) || 1))) : ''}</td></tr>`).join('')}</table>`).join('')
  return page(title, `<h1>${esc(title)}</h1><p class="meta">${esc(typeName || '')} · template</p>${sections}`)
}

export function printHtml(html) {
  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  frame.style.cssText = 'position:fixed;width:0;height:0;border:0;right:0;bottom:0'
  document.body.appendChild(frame)
  const doc = frame.contentWindow.document
  doc.open(); doc.write(html); doc.close()
  frame.contentWindow.focus()
  frame.contentWindow.print()
  setTimeout(() => frame.remove(), 60000)
}

// Template rows as stored on the server (notes carry the shopping fields).
export function templateRowsToItems(rows = []) {
  return rows.map((row) => {
    let meta = {}
    try { meta = row.notes ? JSON.parse(row.notes) : {} } catch { meta = {} }
    return meta.templateKind === 'cost'
      ? { kind: 'cost', phase: row.phase, label: row.label, quantity: meta.quantity, unit: meta.unit, unitCost: meta.unitCost }
      : { kind: 'task', phase: row.phase, label: row.label }
  })
}
