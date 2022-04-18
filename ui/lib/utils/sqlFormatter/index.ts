import { format } from '@baurine/sql-formatter-plus'

export default function formatSql(sql?: string): string {
  let formatedSQL = sql || ''
  try {
    formatedSQL = format(sql || '', { uppercase: true })
  } catch (err) {
    console.log(err)
    console.log(sql)
  }
  return formatedSQL
}
