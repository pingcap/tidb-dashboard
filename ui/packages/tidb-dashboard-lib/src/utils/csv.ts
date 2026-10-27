export interface CSVHeader {
  label: string
  key: string
}

export function serializeCSV(
  rows: readonly object[],
  headers: readonly CSVHeader[]
) {
  const cell = (value: unknown) => {
    let text = String(value ?? '')
    // Quoting alone does not prevent spreadsheets from evaluating formula-like text.
    if (typeof value === 'string' && /^\s*[=+\-@]/.test(text)) {
      text = `'${text}`
    }
    return `"${text.replace(/"/g, '""')}"`
  }

  return [
    headers.map(({ label }) => cell(label)).join(','),
    ...rows.map((row) =>
      headers
        .map(({ key }) => cell((row as Record<string, unknown>)[key]))
        .join(',')
    )
  ].join('\n')
}
