import { getValueFormat } from "@baurine/grafana-value-formats"
import dayjs from "dayjs"

export function formatTime(ms: number, format: string = "YYYY-MM-DD HH:mm:ss") {
  return dayjs(ms).format(format)
}

export function formatValue(value: number, unit: string) {
  const formatFn = getValueFormat(unit)
  if (unit === "short") {
    return formatFn(value, 0, 1)
  }
  return formatFn(value, 1)
}
