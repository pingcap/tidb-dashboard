// import { formatSql } from '../../components/HighlightSQL'

function formatSql(sql: string) {
  return sql
}

export function formatReason(reason: string) {
  // reason string example:
  // "Column [a2] appear in Equal or Range Predicate clause(s) in query: select * from `test` . `t2` where `a2` = ?"
  // we need to extract the SQL part and format it

  const MATCH_STR = "in query: "
  const pos = reason.indexOf(MATCH_STR)
  if (pos < 0) {
    return reason
  }
  const sql = reason.slice(pos + MATCH_STR.length)
  const formattedSql = formatSql(sql)
  const newReason =
    reason.slice(0, pos + MATCH_STR.length) + "\n\n" + formattedSql
  return newReason
}
