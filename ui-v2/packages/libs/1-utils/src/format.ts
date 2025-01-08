import { getValueFormat } from "@baurine/grafana-value-formats"
import { format } from "@baurine/sql-formatter-plus"
import { dayjs } from "@tidbcloud/uikit/utils"
import prettyMs from "pretty-ms"

export function formatTime(
  value: number | Date, // number is unix timestamp, unit is milliseconds
  format: string = "YYYY-MM-DD HH:mm:ss",
) {
  return dayjs(value).format(format)
}

export function formatDuration(seconds: number, short = false) {
  if (short) {
    return prettyMs(seconds * 1000, { compact: true })
  } else {
    return prettyMs(seconds * 1000, { verbose: true })
  }
}

export function formatNumByUnit(
  value: number,
  unit: string,
  precision: number = 1,
) {
  if (isNaN(value)) {
    return ""
  }
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
  let formattedSQL = sql
  try {
    formattedSQL = format(sql, { uppercase: true, language: "tidb" })
  } catch (_e) {
    console.log(sql)
  }
  if (compact) {
    formattedSQL = simpleMinifySql(formattedSQL)
  }
  return formattedSQL
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
