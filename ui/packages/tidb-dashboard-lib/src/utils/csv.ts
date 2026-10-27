export interface CSVHeader {
  label: string
  key: string
}

export function serializeCSV(
  rows: readonly object[],
  headers: readonly CSVHeader[]
) {
  const cell = (value: unknown) =>
    `"${String(value ?? '').replace(/"/g, '""')}"`

  return [
    headers.map(({ label }) => cell(label)).join(','),
    ...rows.map((row) =>
      headers
        .map(({ key }) => cell((row as Record<string, unknown>)[key]))
        .join(',')
    )
  ].join('\n')
}
