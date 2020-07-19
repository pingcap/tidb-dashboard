import sqlFormatter from 'sql-formatter-plus'

export default function formatSql(sql?: string): string {
  return sqlFormatter.format(sql || '', { uppercase: true })
}
