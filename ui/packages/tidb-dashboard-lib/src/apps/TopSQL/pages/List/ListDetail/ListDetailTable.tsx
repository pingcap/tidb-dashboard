import React, { useCallback, useMemo } from 'react'
import { SelectionMode, IColumn } from 'office-ui-fabric-react/lib/DetailsList'
import { Tooltip } from 'antd'
import { getValueFormat } from '@baurine/grafana-value-formats'
import { useTranslation } from 'react-i18next'
import { QuestionCircleOutlined } from '@ant-design/icons'
import { CSVLink } from 'react-csv'

import { Bar, TextWrap, CardTable, Card } from '@lib/components'
import { TopsqlSummaryPlanItem } from '@lib/client'

import type { SQLRecord } from '../ListTable'
import { ListDetailContent } from './ListDetailContent'
import { useRecordSelection } from '../../../utils/useRecordSelection'
import {
  convertNoPlanRecord,
  createOverallRecord,
  isNoPlanRecord,
  isOverallRecord
} from '@lib/apps/TopSQL/utils/specialRecord'
import { telemetry } from '@lib/apps/TopSQL/utils/telemetry'

export type InstanceType = 'tidb' | 'tikv'

interface ListDetailTableProps {
  record: SQLRecord
  capacity: number
  instanceType: InstanceType
}

const UNKNOWN_LABEL = 'Unknown'

const formatZero = (v: number) => {
  if (v.toFixed(1) === '0.0') {
    return 0
  }
  return v
}
const shortFormat = (v: number = 0) => {
  return v && v < 0.1 ? '<0.1' : getValueFormat('short')(formatZero(v), 1)
}
const msFormat = (v: number = 0) => {
  return getValueFormat('ms')(formatZero(v), 1)
}

export function ListDetailTable({
  record: sqlRecord,
  capacity,
  instanceType
}: ListDetailTableProps) {
  const { records: planRecords, isMultiPlans } = usePlanRecord(sqlRecord)
  const { t } = useTranslation()

  const tableColumns = useMemo(
    () =>
      [
        {
          name: t('topsql.detail.fields.cpu_time'),
          key: 'cpuTime',
          minWidth: 150,
          maxWidth: 250,
          onRender: (rec: PlanRecord) => (
            <Bar textWidth={80} value={rec.cpuTime!} capacity={capacity}>
              {getValueFormat('ms')(rec.cpuTime, 2)}
            </Bar>
          )
        },
        {
          name: t('topsql.detail.fields.plan'),
          key: 'plan_digest',
          minWidth: 150,
          maxWidth: 150,
          onRender: (rec: PlanRecord) => {
            return isOverallRecord(rec) ? (
              <Tooltip
                title={t('topsql.detail.overall_tooltip')}
                placement="right"
              >
                <span
                  style={{
                    verticalAlign: 'middle',
                    fontStyle: 'italic',
                    color: '#aaa'
                  }}
                >
                  {t('topsql.detail.overall')} <QuestionCircleOutlined />
                </span>
              </Tooltip>
            ) : isNoPlanRecord(rec) ? (
              <Tooltip
                title={t('topsql.detail.no_plan_tooltip')}
                placement="right"
              >
                <span
                  style={{
                    verticalAlign: 'middle',
                    fontStyle: 'italic',
                    color: '#aaa'
                  }}
                >
                  {t('topsql.detail.no_plan')} <QuestionCircleOutlined />
                </span>
              </Tooltip>
            ) : (
              <pre style={{ margin: 0 }}>
                {rec.plan_digest?.slice(0, 8) || UNKNOWN_LABEL}
              </pre>
            )
          }
        },
        {
          name: t('topsql.detail.fields.exec_count_per_sec'),
          key: 'exec_count_per_sec',
          minWidth: 50,
          maxWidth: 150,
          onRender: (rec: PlanRecord) => (
            <TextWrap>{shortFormat(rec.exec_count_per_sec)}</TextWrap>
          )
        },
        instanceType === 'tikv' && {
          name: t('topsql.detail.fields.scan_records_per_sec'),
          key: 'scan_records_per_sec',
          minWidth: 50,
          maxWidth: 150,
          onRender: (rec: PlanRecord) => (
            <TextWrap>{shortFormat(rec.scan_records_per_sec)}</TextWrap>
          )
        },
        instanceType === 'tikv' && {
          name: t('topsql.detail.fields.scan_indexes_per_sec'),
          key: 'scan_indexes_per_sec',
          minWidth: 50,
          maxWidth: 150,
          onRender: (rec: PlanRecord) => (
            <TextWrap>{shortFormat(rec.scan_indexes_per_sec)}</TextWrap>
          )
        },
        instanceType === 'tidb' && {
          name: t('topsql.detail.fields.duration_per_exec_ms'),
          key: 'duration_per_exec_ms',
          minWidth: 50,
          maxWidth: 150,
          onRender: (rec: PlanRecord) => (
            <TextWrap>{msFormat(rec.duration_per_exec_ms)}</TextWrap>
          )
        }
      ].filter((c) => !!c) as IColumn[],
    [capacity, instanceType, t]
  )

  const csvHeaders = tableColumns.map((c) => ({ label: c.name, key: c.key }))

  const getKey = useCallback((r: PlanRecord) => r?.plan_digest!, [])

  const { selectedRecord, selection } = useRecordSelection<PlanRecord>({
    storageKey: 'topsql.list_detail_table_selected_key',
    selections: planRecords,
    options: {
      getKey,
      canSelectItem: (r) => !isNoPlanRecord(r) && !isOverallRecord(r)
    }
  })

  const planRecord = useMemo(() => {
    if (isMultiPlans) {
      return selectedRecord
    }

    return planRecords[0]
  }, [planRecords, isMultiPlans, selectedRecord])

  return (
    <>
      <Card noMarginBottom noMarginTop>
        <CSVLink
          data={planRecords || []}
          headers={csvHeaders}
          filename="topsql-plan"
        >
          Download to CSV
        </CSVLink>
      </Card>
      <CardTable
        listProps={
          {
            'data-e2e': 'topsql_listdetail_table'
          } as any
        }
        cardNoMarginTop
        getKey={getKey}
        items={planRecords}
        columns={tableColumns}
        selectionMode={SelectionMode.single}
        selectionPreservedOnEmptyClick
        onRowClicked={(item) => {
          const index = planRecords
            .filter((r) => !isOverallRecord(r) && !isNoPlanRecord(r))
            .findIndex((r) => r.plan_digest === item.plan_digest)
          if (index > -1) {
            telemetry.clickPlan(index)
          }
        }}
        selection={selection}
      />
      {!sqlRecord.is_other && (
        <ListDetailContent sqlRecord={sqlRecord} planRecord={planRecord} />
      )}
    </>
  )
}

export type PlanRecord = {
  cpuTime: number
} & TopsqlSummaryPlanItem

const usePlanRecord = (
  record: SQLRecord
): { isMultiPlans: boolean; records: PlanRecord[] } => {
  return useMemo(() => {
    if (!record?.plans?.length) {
      return { isMultiPlans: false, records: [] }
    }

    const isMultiPlans = record.plans.length > 1
    const plans = [...record.plans]

    const records: PlanRecord[] = plans
      .map((p) => {
        const cpuTime = p.cpu_time_ms?.reduce((pt, t) => pt + t, 0) || 0
        return {
          ...p,
          cpuTime
        }
      })
      .sort((a, b) => b.cpuTime - a.cpuTime)
      .map(convertNoPlanRecord)

    // add overall record to the first
    if (isMultiPlans) {
      records.unshift(createOverallRecord(record))
    }

    return { isMultiPlans, records }
  }, [record])
}
