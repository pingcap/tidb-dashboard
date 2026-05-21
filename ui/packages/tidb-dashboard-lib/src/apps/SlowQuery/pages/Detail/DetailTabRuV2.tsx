import React, { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { getValueFormat } from '@baurine/grafana-value-formats'

import { RequestUnitV2Metrics, SlowqueryModel } from '@lib/client'
import { CardTable, Pre } from '@lib/components'
import { valueColumns } from '@lib/utils/tableColumns'

const num = (v: number | undefined, unit: 'short' | 'bytes' = 'short') =>
  v == null ? '' : getValueFormat(unit)(v, 2)

const mapToCompactJson = (map: Record<string, number> | undefined): string => {
  if (!map || Object.keys(map).length === 0) return ''
  return JSON.stringify(map)
}

/**
 * Metrics struct rows for the metrics table inside the RU V2 tab.
 */
function buildMetricsItems(data: SlowqueryModel) {
  const m: RequestUnitV2Metrics = data.ru_v2_metrics ?? {}
  return [
    { key: 'ru_v2_metrics.total_ru', value: num(m.total_ru) },
    { key: 'ru_v2_metrics.tidb_ru', value: num(m.tidb_ru) },
    { key: 'ru_v2_metrics.tikv_ru', value: num(m.tikv_ru) },
    { key: 'ru_v2_metrics.tiflash_ru', value: num(m.tiflash_ru) },
    { key: 'ru_v2_metrics.txn_cnt', value: num(m.txn_cnt) },
    { key: 'ru_v2_metrics.plan_cnt', value: num(m.plan_cnt) },
    {
      key: 'ru_v2_metrics.plan_derive_stats_paths',
      value: num(m.plan_derive_stats_paths)
    },
    {
      key: 'ru_v2_metrics.session_parser_total',
      value: num(m.session_parser_total)
    },
    { key: 'ru_v2_metrics.executor_l1', value: num(m.executor_l1) },
    { key: 'ru_v2_metrics.executor_l2', value: num(m.executor_l2) },
    { key: 'ru_v2_metrics.executor_l3', value: num(m.executor_l3) },
    {
      key: 'ru_v2_metrics.executor_l5_insert_rows',
      value: num(m.executor_l5_insert_rows)
    },
    {
      key: 'ru_v2_metrics.result_chunk_cells',
      value: num(m.result_chunk_cells)
    },
    {
      key: 'ru_v2_metrics.resource_manager_read_cnt',
      value: num(m.resource_manager_read_cnt)
    },
    {
      key: 'ru_v2_metrics.resource_manager_write_cnt',
      value: num(m.resource_manager_write_cnt)
    },
    {
      key: 'ru_v2_metrics.tikv_coprocessor_executor_iterations',
      value: num(m.tikv_coprocessor_executor_iterations)
    },
    {
      key: 'ru_v2_metrics.tikv_coprocessor_response_bytes',
      value: num(m.tikv_coprocessor_response_bytes, 'bytes')
    },
    {
      key: 'ru_v2_metrics.tikv_coprocessor_executor_work_total',
      value: mapToCompactJson(m.tikv_coprocessor_executor_work_total)
    },
    {
      key: 'ru_v2_metrics.tikv_storage_processed_keys_get',
      value: num(m.tikv_storage_processed_keys_get)
    },
    {
      key: 'ru_v2_metrics.tikv_storage_processed_keys_batch_get',
      value: num(m.tikv_storage_processed_keys_batch_get)
    },
    {
      key: 'ru_v2_metrics.tikv_kv_engine_cache_miss',
      value: num(m.tikv_kv_engine_cache_miss)
    },
    {
      key: 'ru_v2_metrics.tikv_raftstore_store_write_trigger_wb_bytes',
      value: num(m.tikv_raftstore_store_write_trigger_wb_bytes, 'bytes')
    }
  ]
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: '#262626',
          marginBottom: 8
        }}
      >
        {title}
      </div>
      {children}
    </div>
  )
}

export function RuV2TabContent({
  data,
  schemaColumns
}: {
  data: SlowqueryModel
  schemaColumns: string[]
}) {
  const { t } = useTranslation()
  const schemaSet = new Set(schemaColumns)
  const v2 = data.ru_v2
  const v2Detail = data.ru_v2_detail

  // Schema (available_fields) tells us which RU V2 fields the backend can
  // populate for this cluster tier. Premium only declares `ru_v2`; Starter /
  // Essential declare `ru_v2`, `ru_v2_detail`, `ru_v2_metrics`. Hide each
  // section if its field is not in the schema, regardless of the data value.
  const showV2 = schemaSet.has('ru_v2')
  const showDetail = schemaSet.has('ru_v2_detail')
  const showMetrics = schemaSet.has('ru_v2_metrics')
  const metricsItems = showMetrics ? buildMetricsItems(data) : []

  // Columns: Name + Value only (drop the Description column).
  const nameValueColumns = valueColumns('slow_query.fields.').slice(0, 2)

  return (
    <div style={{ padding: '8px 16px' }}>
      {showV2 && (
        <Section title={t('slow_query.fields.ru_v2')}>
          <span style={{ fontSize: 13 }}>{num(v2)}</span>
        </Section>
      )}

      {showDetail && (
        <Section title={t('slow_query.fields.ru_v2_detail')}>
          <Pre style={{ margin: 0, fontSize: 12, lineHeight: 1.5 }}>
            {v2Detail ?? ''}
          </Pre>
        </Section>
      )}

      {showMetrics && (
        <Section title={t('slow_query.fields.ru_v2_metrics_label')}>
          <CardTable
            cardNoMargin
            columns={nameValueColumns}
            items={metricsItems}
            extendLastColumn
          />
        </Section>
      )}
    </div>
  )
}
