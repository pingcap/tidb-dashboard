import interpolate from "string-template"

export enum TransformNullValue {
  NULL = "null",
  AS_ZERO = "as_zero",
}

export type PromResultItem = {
  metric: Record<string, string>
  values: ([number, string] | { timestamp: number; value: string })[]
}

export type PromSeriesItem = {
  name: string
  data: [number, number | null][]
}

////////////////////////////////

const POSITIVE_INFINITY_SAMPLE_VALUE = "+Inf"
const NEGATIVE_INFINITY_SAMPLE_VALUE = "-Inf"

function parseStrVal(value: string): number {
  switch (value) {
    case POSITIVE_INFINITY_SAMPLE_VALUE:
      return Number.POSITIVE_INFINITY
    case NEGATIVE_INFINITY_SAMPLE_VALUE:
      return Number.NEGATIVE_INFINITY
    default:
      return parseFloat(value)
  }
}

function transformStrVal(value: string, nullValue?: TransformNullValue) {
  let v: number | null = parseStrVal(value)
  if (isNaN(v)) {
    if (nullValue === TransformNullValue.AS_ZERO) {
      v = 0
    } else {
      v = null
    }
  }
  return v
}

export function transformPromResultItem(
  item: PromResultItem,
  nameTemplate: string,
  nullValue?: TransformNullValue,
): PromSeriesItem {
  const name = interpolate(nameTemplate, item.metric)
  return {
    name,
    data: item.values.map((v) => {
      const [ts, val] = Array.isArray(v) ? v : [v.timestamp, v.value]
      return [ts * 1000, transformStrVal(val, nullValue)]
    }),
  }
}

////////////////////////////////

export const DEF_SCRAPE_INTERVAL = 30

export function resolvePromQLTemplate(
  promql: string,
  step: number,
  scrapeInterval: number = DEF_SCRAPE_INTERVAL,
): string {
  return promql.replace(
    /\$__rate_interval/g,
    `${Math.max(step + scrapeInterval, 4 * scrapeInterval)}s`,
  )
}

export function calcPromQueryStep(
  tr: [number, number],
  width: number,
  minBinWidth: number = 5,
  scrapeInterval: number = DEF_SCRAPE_INTERVAL,
) {
  if (width <= 0) {
    return scrapeInterval
  }
  const points = width / minBinWidth
  const step = (tr[1] - tr[0]) / points
  const fixedStep = Math.ceil(step / scrapeInterval) * scrapeInterval
  return fixedStep
}
