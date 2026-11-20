import { esc, printHtml } from './printDoc.js'

// The ukugida book as something a family can keep outside the app: a
// spreadsheet (CSV, opens in Excel or Google Sheets) and a printable page
// (print it, or "Save as PDF" from the print screen).

const dateOf = (value) => {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)
}

const ROWS = (entries) => [...entries]
  .sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate))
  .map((e) => ({
    date: dateOf(e.eventDate),
    direction: e.direction === 'RECEIVED' ? 'Received' : 'Given',
    person: e.counterpartyName || '',
    item: e.itemDescription || '',
    quantity: e.quantity ?? '',
    unit: e.unitType || '',
    ceremony: e.ceremonyLabel || '',
    place: e.location || '',
  }))

const HEADERS = ['Date', 'Given or received', 'From or to', 'Item', 'Quantity', 'Unit', 'Ceremony', 'Place']

// A spreadsheet cell: quoted when needed, and never starting with = + - @
// so a name cannot run as a formula when the file is opened.
function cell(value) {
  let text = String(value ?? '')
  if (/^[=+\-@]/.test(text)) text = `'${text}`
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function ukugidaCsv(entries) {
  const lines = [HEADERS.map(cell).join(',')]
  for (const r of ROWS(entries)) lines.push([r.date, r.direction, r.person, r.item, r.quantity, r.unit, r.ceremony, r.place].map(cell).join(','))
  return lines.join('\r\n') + '\r\n'
}


export function ukugidaBookHtml(entries, ownerName = '') {
  const rows = ROWS(entries).map((r) => `<tr><td>${esc(r.date)}</td><td>${esc(r.direction)}</td><td>${esc(r.person)}</td><td>${esc(r.item)}</td><td>${esc(r.quantity)} ${esc(r.unit)}</td><td>${esc(r.ceremony)}</td></tr>`).join('')
  return `<!doctype html><html><head><meta charset="utf-8"><title>Incwadi yokugida${ownerName ? ` · ${esc(ownerName)}` : ''}</title>
<style>body{font-family:Georgia,serif;color:#2b2620;margin:32px}h1{margin:0;font-size:26px}p{margin:4px 0 18px;color:#6b6258;font-family:Arial,sans-serif;font-size:12px}
table{width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px}th{text-align:left;border-bottom:2px solid #2e4a2e;padding:6px 4px}td{border-bottom:1px solid #ddd;padding:6px 4px;vertical-align:top}</style></head>
<body><h1>Incwadi yokugida · The ukugida book</h1><p>${ownerName ? `${esc(ownerName)} · ` : ''}What was given and received, kept on i-Camagu. Printed ${esc(dateOf(new Date()))}.</p>
<table><thead><tr><th>Date</th><th>Given or received</th><th>From or to</th><th>Item</th><th>How many</th><th>Ceremony</th></tr></thead><tbody>${rows}</tbody></table></body></html>`
}

export function downloadUkugidaCsv(entries) {
  const blob = new Blob(['﻿' + ukugidaCsv(entries)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ukugida-book-${dateOf(new Date())}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function printUkugidaBook(entries, ownerName) {
  printHtml(ukugidaBookHtml(entries, ownerName))
}
