import TiDBSQLFormatter from './TiDBSQLFormatter'

const mySqlFormatter = new TiDBSQLFormatter({ uppercase: true })

export default function formatSql(sql?: string): string {
  // return mySqlFormatter.format(sql || '')
  return sql!
}
