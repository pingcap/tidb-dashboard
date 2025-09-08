import { getValueFormat } from '@baurine/grafana-value-formats'

export function formatNumByUnit(
  value: number,
  unit: string,
  precision: number = 1
) {
  if (isNaN(value)) {
    return ''
  }
  const formatFn = getValueFormat(unit)
  if (!formatFn) {
    return value + ''
  }
  if (unit === 'short') {
    return formatFn(value, 0, precision)
  }
  return formatFn(value, precision)
}
