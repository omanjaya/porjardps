/**
 * RFC 4180 compliant CSV export utility.
 * Includes BOM prefix for Excel compatibility.
 */

function escapeCSVValue(value: unknown): string {
  if (value == null) return ''
  const str = String(value)
  // If value contains comma, double quote, or newline, wrap in quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function downloadCSV(
  data: Record<string, unknown>[],
  filename: string,
  columns: { key: string; header: string }[]
): void {
  if (data.length === 0) return

  // Build header row
  const headerRow = columns.map((col) => escapeCSVValue(col.header)).join(',')

  // Build data rows
  const dataRows = data.map((row) =>
    columns
      .map((col) => {
        // Support nested keys like "team.name"
        const keys = col.key.split('.')
        let value: unknown = row
        for (const k of keys) {
          if (value != null && typeof value === 'object') {
            value = (value as Record<string, unknown>)[k]
          } else {
            value = undefined
            break
          }
        }
        return escapeCSVValue(value)
      })
      .join(',')
  )

  // BOM + header + data
  const BOM = '\uFEFF'
  const csvContent = BOM + [headerRow, ...dataRows].join('\r\n')

  // Trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
