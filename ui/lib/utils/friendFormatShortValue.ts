import { getValueFormat } from '@baurine/grafana-value-formats'

export default function friendFormatShortValue(
  val: number,
  decimal: number
): string {
  if (val < 1000) {
    return `${val}`
  }
  return getValueFormat('short')(val, decimal)
}
