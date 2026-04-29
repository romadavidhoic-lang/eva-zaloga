// CSV / Excel export helpers (no external deps — uses data URIs)

export function exportCSV(filename, rows, columns) {
  const header = columns.map((c) => `"${c.label}"`).join(',')
  const body = rows
    .map((row) => columns.map((c) => `"${String(row[c.key] ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const csv = '﻿' + header + '\n' + body // BOM for Excel UTF-8
  download(`${filename}.csv`, 'text/csv', csv)
}

export function exportJSON(filename, data) {
  download(`${filename}.json`, 'application/json', JSON.stringify(data, null, 2))
}

function download(filename, mime, content) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8;` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('sl-SI')
}

export function formatCurrency(val) {
  if (val == null) return '—'
  return new Intl.NumberFormat('sl-SI', { style: 'currency', currency: 'EUR' }).format(val)
}
