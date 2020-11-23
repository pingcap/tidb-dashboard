import MySqlFormatter from './MySqlFormatter/MySqlFormatter'

const mySqlFormatter = new MySqlFormatter({ uppercase: true })

export default function formatSql(sql?: string): string {
  return mySqlFormatter.format(sql || '')
}
