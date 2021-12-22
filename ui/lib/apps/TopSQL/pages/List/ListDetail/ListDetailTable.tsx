import React, { useMemo } from 'react'
import { SelectionMode } from 'office-ui-fabric-react/lib/DetailsList'
import { Tooltip } from 'antd'
import { getValueFormat } from '@baurine/grafana-value-formats'

import {
  Bar,
  TextWrap,
  CardTable,
  ICardTableProps,
  createUnselectableRow,
} from '@lib/components'
import { TopsqlPlanItem } from '@lib/client'

import type { SQLRecord } from '../ListTable'
import { ListDetailContent } from './ListDetailContent'
import { useSelectedRecord } from '../../../utils/useSelectedRecord'

interface ListDetailTableProps {
  record: SQLRecord
}

const canSelect = (r: PlanRecord): boolean => {
  return !!r.plan_digest && r.plan_digest !== OVERALL_LABEL
}

const unselectableRow = createUnselectableRow((props) => !canSelect(props.item))

export function ListDetailTable({ record }: ListDetailTableProps) {
  const { records, isMultiPlans, totalCpuTime } = usePlanRecord(record)

  const tableColumns = useMemo(
    () => [
      {
        name: 'CPU',
        key: 'cpuTime',
        minWidth: 150,
        maxWidth: 250,
        onRender: (rec: PlanRecord) => (
          <Bar textWidth={70} value={rec.totalCpuTime!} capacity={totalCpuTime}>
            {getValueFormat('ms')(rec.totalCpuTime, 0, 0)}
          </Bar>
        ),
      },
      {
        name: 'Plan',
        key: 'plan',
        minWidth: 150,
        maxWidth: 150,
        onRender: (rec: PlanRecord) => {
          return rec.plan_digest === '(Overall)' ? (
            rec.plan_digest
          ) : (
            <Tooltip title={rec.plan_digest} placement="right">
              <TextWrap>{rec.plan_digest}</TextWrap>
            </Tooltip>
          )
        },
      },
    ],
    [totalCpuTime]
  )

  const { getSelectedRecord, setSelectedRecord, selection } =
    useSelectedRecord<PlanRecord>({
      selections: records,
      getKey: (r) => r.plan_digest!,
      disableSelection: (r) => !canSelect(r),
    })

  let tableProps: ICardTableProps = {
    cardNoMarginTop: true,
    getKey: (r: PlanRecord) => r.plan_digest!,
    items: records || [],
    columns: tableColumns,
    onRenderRow: unselectableRow,
    selectionMode: SelectionMode.none,
  }
  if (isMultiPlans) {
    tableProps = {
      ...tableProps,
      selectionMode: SelectionMode.single,
      selectionPreservedOnEmptyClick: true,
      onRowClicked: setSelectedRecord,
      selection,
    }
  }

  const planRecord = useMemo(() => {
    if (isMultiPlans) {
      return getSelectedRecord()
    }
    return records[0]
  }, [records])

  return (
    <>
      <CardTable {...tableProps} />
      <ListDetailContent sqlRecord={record} planRecord={planRecord} />
    </>
  )
}

export type PlanRecord = {
  totalCpuTime: number
} & TopsqlPlanItem

const OVERALL_LABEL = '(Overall)'

const usePlanRecord = (record: SQLRecord) => {
  const isMultiPlans = record.plans.length > 1
  const plans = [...record.plans]

  let totalCpuTime = 0
  const records: PlanRecord[] = plans.map((p) => {
    const cpuTime = p.cpu_time_millis?.reduce((pt, t) => pt + t, 0) || 0
    totalCpuTime += cpuTime
    return {
      ...p,
      // plan may be empty
      plan_digest: p.plan_digest || 'Unknown',
      totalCpuTime: cpuTime,
    }
  })

  // add overall
  isMultiPlans &&
    records.unshift(
      records.reduce(
        (prev, current) => {
          prev.totalCpuTime += current.totalCpuTime
          return prev
        },
        {
          plan_digest: OVERALL_LABEL,
          totalCpuTime: 0,
        } as PlanRecord
      )
    )

  return { isMultiPlans, records, totalCpuTime }
}
