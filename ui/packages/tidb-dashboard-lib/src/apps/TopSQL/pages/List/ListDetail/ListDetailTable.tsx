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
import { OrderBy } from '../List'

export type InstanceType = 'tidb' | 'tikv'

interface ListDetailTableProps {
  record: SQLRecord
  capacity: number
  instanceType: InstanceType
  orderBy: OrderBy
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
  instanceType,
  orderBy
}: ListDetailTableProps) {
  const {
    records: planRecords,
    isMultiPlans,
    detailCapacity
  } = usePlanRecord(sqlRecord, orderBy)
  const { t } = useTranslation()

  // Use detailCapacity if available, otherwise fall back to capacity from parent
  const effectiveCapacity = detailCapacity > 0 ? detailCapacity : capacity

  // Get column title and value based on orderBy
  const getColumnTitle = () => {
    switch (orderBy) {
      case OrderBy.NetworkBytes:
        return t('topsql.detail.fields.network_bytes') || 'Network Bytes'
      case OrderBy.LogicalIoBytes:
        return t('topsql.detail.fields.logical_io_bytes') || 'Logical IO Bytes'
      case OrderBy.CpuTime:
      default:
        return t('topsql.detail.fields.cpu_time')
    }
  }

  const getColumnValue = (rec: PlanRecord): number => {
    switch (orderBy) {
      case OrderBy.NetworkBytes:
        return rec.networkBytes || 0
      case OrderBy.LogicalIoBytes:
        return rec.logicalIoBytes || 0
      case OrderBy.CpuTime:
      default:
        return rec.cpuTime || 0
    }
  }

  const getValueFormatter = () => {
    switch (orderBy) {
      case OrderBy.NetworkBytes:
      case OrderBy.LogicalIoBytes:
        return (v: number) => getValueFormat('bytes')(v, 2)
      case OrderBy.CpuTime:
      default:
        return (v: number) => getValueFormat('ms')(v, 2)
    }
  }

  const formatter = getValueFormatter()

  const tableColumns = useMemo(
    () =>
      [
        {
          name: getColumnTitle(),
          key:
            orderBy === OrderBy.NetworkBytes
              ? 'networkBytes'
              : orderBy === OrderBy.LogicalIoBytes
              ? 'logicalIoBytes'
              : 'cpuTime',
          minWidth: 150,
          maxWidth: 250,
          onRender: (rec: PlanRecord) => {
            const value = getColumnValue(rec)
            return (
              <Bar textWidth={80} value={value} capacity={effectiveCapacity}>
                {formatter(value)}
              </Bar>
            )
          }
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
    [effectiveCapacity, instanceType, orderBy, t]
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
  networkBytes?: number
  logicalIoBytes?: number
} & TopsqlSummaryPlanItem

const usePlanRecord = (
  record: SQLRecord,
  orderBy: OrderBy
): { isMultiPlans: boolean; records: PlanRecord[]; detailCapacity: number } => {
  return useMemo(() => {
    if (!record?.plans?.length) {
      return { isMultiPlans: false, records: [], detailCapacity: 0 }
    }

    const isMultiPlans = record.plans.length > 1
    const plans = [...record.plans]

    let detailCapacity = 0

    const records: PlanRecord[] = plans
      .map((p) => {
        const cpuTime = p.cpu_time_ms?.reduce((pt, t) => pt + t, 0) || 0
        const networkBytes = p.network_bytes?.reduce((pt, t) => pt + t, 0) || 0
        const logicalIoBytes =
          p.logical_io_bytes?.reduce((pt, t) => pt + t, 0) || 0

        // Calculate capacity based on the selected orderBy dimension
        let value = 0
        switch (orderBy) {
          case OrderBy.NetworkBytes:
            value = networkBytes
            break
          case OrderBy.LogicalIoBytes:
            value = logicalIoBytes
            break
          case OrderBy.CpuTime:
          default:
            value = cpuTime
            break
        }

        if (detailCapacity < value) {
          detailCapacity = value
        }

        return {
          ...p,
          cpuTime,
          networkBytes,
          logicalIoBytes
        }
      })
      .sort((a, b) => {
        // Sort based on the selected orderBy dimension
        let aValue = 0
        let bValue = 0
        switch (orderBy) {
          case OrderBy.NetworkBytes:
            aValue = a.networkBytes || 0
            bValue = b.networkBytes || 0
            break
          case OrderBy.LogicalIoBytes:
            aValue = a.logicalIoBytes || 0
            bValue = b.logicalIoBytes || 0
            break
          case OrderBy.CpuTime:
          default:
            aValue = a.cpuTime
            bValue = b.cpuTime
            break
        }
        return bValue - aValue
      })
      .map(convertNoPlanRecord)

    // add overall record to the first
    if (isMultiPlans) {
      const overallRecord = createOverallRecord(record, orderBy)
      records.unshift(overallRecord)
      // Update capacity if overall record has larger value
      const overallValue = getOverallValue(overallRecord, orderBy)
      if (detailCapacity < overallValue) {
        detailCapacity = overallValue
      }
    }

    return { isMultiPlans, records, detailCapacity }
  }, [record, orderBy])
}

const getOverallValue = (rec: PlanRecord, orderBy: OrderBy): number => {
  switch (orderBy) {
    case OrderBy.NetworkBytes:
      return rec.networkBytes || 0
    case OrderBy.LogicalIoBytes:
      return rec.logicalIoBytes || 0
    case OrderBy.CpuTime:
    default:
      return rec.cpuTime || 0
  }
}
