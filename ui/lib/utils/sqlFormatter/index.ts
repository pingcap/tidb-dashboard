// import TiDBSQLFormatter from './TiDBSQLFormatter'

// const mySqlFormatter = new TiDBSQLFormatter({ uppercase: true })

import { format } from 'sql-formatter'

export default function formatSql(sql?: string): string {
  // return mySqlFormatter.format(sql || '')
  return format(sql || '', { uppercase: true, language: 'mysql' })
}
