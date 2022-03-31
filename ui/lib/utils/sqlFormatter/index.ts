// import TiDBSQLFormatter from './TiDBSQLFormatter'

// const mySqlFormatter = new TiDBSQLFormatter({ uppercase: true })

// export default function formatSql(sql?: string): string {
//   return mySqlFormatter.format(sql || '')
// }

import { format } from 'sql-formatter'

export default function formatSql(sql?: string): string {
  let formatedSQL = sql || ''
  try {
    formatedSQL = format(sql || '', { uppercase: true, language: 'mysql' })
  } catch (err) {
    console.log(err)
    console.log(sql)
  }
  return formatedSQL
}
