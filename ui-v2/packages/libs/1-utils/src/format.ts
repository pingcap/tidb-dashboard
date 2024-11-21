import { getValueFormat } from "@baurine/grafana-value-formats"
import { format } from "@baurine/sql-formatter-plus"
import dayjs from "dayjs"

export function formatTime(ms: number, format: string = "YYYY-MM-DD HH:mm:ss") {
  return dayjs(ms).format(format)
}

export function formatNumByUnit(
  value: number,
  unit: string,
  precision: number = 1,
) {
  const formatFn = getValueFormat(unit)
  if (!formatFn) {
    return value + ""
  }
  if (unit === "short") {
    return formatFn(value, 0, precision)
  }
  return formatFn(value, precision)
}

export function formatSql(sql: string, compact: boolean = false): string {
  let formatedSQL = sql
  try {
    formatedSQL = format(sql, { uppercase: true, language: "tidb" })
  } catch (_e) {
    console.log(sql)
  }
  if (compact) {
    formatedSQL = simpleMinifySql(formatedSQL)
  }
  return formatedSQL
}

// remove extra spaces to make sql more compact
export function simpleMinifySql(str: string) {
  return str
    .replace(/\s{1,}/g, " ")
    .replace(/\{\s{1,}/g, "{")
    .replace(/\}\s{1,}/g, "}")
    .replace(/;\s{1,}/g, ";")
    .replace(/\/\*\s{1,}/g, "/*")
    .replace(/\*\/\s{1,}/g, "*/")
}
