// Copyright Grafana. Licensed under Apache-2.0.

// Extracted from:
// https://github.com/grafana/grafana/blob/c986aaa0a8e7fb167b9d10304129f6aea85ad45c/public/app/plugins/datasource/prometheus/types.ts

export interface PromMetricsMetadataItem {
  type: string
  help: string
  unit?: string
}

export interface PromMetricsMetadata {
  [metric: string]: PromMetricsMetadataItem[]
}

export interface PromDataSuccessResponse<T = PromData> {
  status: 'success'
  data: T
}

export interface PromDataErrorResponse<T = PromData> {
  status: 'error'
  errorType: string
  error: string
  data: T
}

export type PromData =
  | PromMatrixData
  | PromVectorData
  | PromScalarData
  | PromExemplarData[]

export interface Labels {
  [index: string]: any
}

export interface Exemplar {
  labels: Labels
  value: number
  timestamp: number
}

export interface PromExemplarData {
  seriesLabels: PromMetric
  exemplars: Exemplar[]
}

export interface PromVectorData {
  resultType: 'vector'
  result: Array<{
    metric: PromMetric
    value: PromValue
  }>
}

export interface PromMatrixData {
  resultType: 'matrix'
  result: Array<{
    metric: PromMetric
    values: PromValue[]
  }>
}

export interface PromScalarData {
  resultType: 'scalar'
  result: PromValue
}

export type PromValue = [number, any]

export interface PromMetric {
  __name__?: string
  [index: string]: any
}

export function isMatrixData(
  result: MatrixOrVectorResult
): result is PromMatrixData['result'][0] {
  return 'values' in result
}

export type MatrixOrVectorResult =
  | PromMatrixData['result'][0]
  | PromVectorData['result'][0]

// Our customized types

export interface QueryOptions {
  step: number
  start: number
  end: number
}

export type DataPoint = [msTimestamp: number, value: number | null]
