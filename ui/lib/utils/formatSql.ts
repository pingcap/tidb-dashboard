import sqlFormatter from 'sql-formatter-plus-plus'

export default function formatSql(sql?: string): string {
  return sqlFormatter.format(sql || '', { uppercase: true })
}
