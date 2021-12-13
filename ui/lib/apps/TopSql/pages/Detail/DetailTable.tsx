import React, { useMemo, useState, useCallback } from 'react'
import { SelectionMode } from 'office-ui-fabric-react/lib/DetailsList'
import { Tooltip } from 'antd'
import { getValueFormat } from '@baurine/grafana-value-formats'
import { getTheme } from 'office-ui-fabric-react/lib/Styling'
import {
  DetailsRow,
  IDetailsListProps,
  IDetailsRowStyles,
} from 'office-ui-fabric-react'

import { Bar, TextWrap, CardTable, ICardTableProps } from '@lib/components'
import { TopsqlPlanItem } from '@lib/client'

import type { SQLRecord } from '../TopSqlTable'
import { DetailContent } from './DetailContent'

interface TopSqlDetailTableProps {
  record: SQLRecord
}

const theme = getTheme()

export function DetailTable({ record }: TopSqlDetailTableProps) {
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

  const { selectedRecord, setSelectedRecord } = useSelectedRecord()

  let tableProps: ICardTableProps = {
    cardNoMarginTop: true,
    getKey: (r: PlanRecord) => r.plan_digest!,
    items: records || [],
    columns: tableColumns,
    onRenderRow: renderRow,
  }
  if (isMultiPlans) {
    tableProps = {
      ...tableProps,
      selectionMode: SelectionMode.single,
      selectionPreservedOnEmptyClick: true,
      onRowClicked: setSelectedRecord,
    }
  }

  const planRecord = useMemo(() => {
    if (isMultiPlans) {
      return selectedRecord
    }
    return records[0]
  }, [records])

  return (
    <>
      <CardTable {...tableProps} />
      <DetailContent sqlRecord={record} planRecord={planRecord} />
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

const canSelect = (r: PlanRecord): boolean => {
  return !!r.plan_digest && r.plan_digest !== OVERALL_LABEL
}

const useSelectedRecord = () => {
  const [record, setRecord] = useState<PlanRecord | null>(null)
  const handleSelect = useCallback(
    (r: PlanRecord | null) => {
      if (!!r && !canSelect(r)) {
        return
      }

      const areDifferentRecords = !!r && r.plan_digest !== record?.plan_digest
      if (areDifferentRecords) {
        setRecord(r)
      }
    },
    [record]
  )

  return { selectedRecord: record, setSelectedRecord: handleSelect }
}

const renderRow: IDetailsListProps['onRenderRow'] = (props) => {
  if (!props) {
    return null
  }

  const customStyles: Partial<IDetailsRowStyles> = {}
  if (!canSelect(props.item)) {
    customStyles.root = {
      backgroundColor: theme.palette.neutralLighter,
      cursor: 'not-allowed',
      pointerEvents: 'none',
      color: '#aaa',
      fontStyle: 'italic',
    }
  }

  return <DetailsRow {...props} styles={customStyles} />
}
