// Copyright Grafana. Licensed under Apache-2.0.

// Extracted from:
// https://github.com/grafana/grafana/blob/c986aaa0a8e7fb167b9d10304129f6aea85ad45c/public/app/plugins/datasource/prometheus/result_transformer.ts

import { DEFAULT_MIN_INTERVAL_SEC } from '.'
import {
  DataPoint,
  isMatrixData,
  MatrixOrVectorResult,
  QueryOptions
} from './types'

const POSITIVE_INFINITY_SAMPLE_VALUE = '+Inf'
const NEGATIVE_INFINITY_SAMPLE_VALUE = '-Inf'

function parseSampleValue(value: string): number {
  switch (value) {
    case POSITIVE_INFINITY_SAMPLE_VALUE:
      return Number.POSITIVE_INFINITY
    case NEGATIVE_INFINITY_SAMPLE_VALUE:
      return Number.NEGATIVE_INFINITY
    default:
      return parseFloat(value)
  }
}

export function processRawData(
  data: MatrixOrVectorResult,
  options: QueryOptions
): DataPoint[] | null {
  if (isMatrixData(data)) {
    const stepMs = options.step ? options.step * 1000 : NaN
    let baseTimestamp = options.start * 1000
    const dps: DataPoint[] = []

    for (const value of data.values) {
      let dpValue: number | null = parseSampleValue(value[1])

      if (isNaN(dpValue)) {
        dpValue = null
      }

      const timestamp = value[0] * 1000
      for (let t = baseTimestamp; t < timestamp; t += stepMs) {
        dps.push([t, null])
      }
      baseTimestamp = timestamp + stepMs
      dps.push([timestamp, dpValue])
    }

    const endTimestamp = options.end * 1000
    for (let t = baseTimestamp; t <= endTimestamp; t += stepMs) {
      dps.push([t, null])
    }

    return dps
  }
  return null
}

export function resolveQueryTemplate(
  template: string,
  options: QueryOptions
): string {
  return template.replaceAll(
    '$__rate_interval',
    `${Math.max(options.step, 4 * DEFAULT_MIN_INTERVAL_SEC)}s`
  )
}
