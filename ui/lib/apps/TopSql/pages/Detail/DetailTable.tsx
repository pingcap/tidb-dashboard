import React, { useMemo, useState, useEffect, useCallback } from 'react'
import { usePersistFn } from 'ahooks'
import { useTranslation } from 'react-i18next'
import { Space } from 'antd'
import {
  SelectionMode,
  Selection,
} from 'office-ui-fabric-react/lib/DetailsList'
import {
  MarqueeSelection,
  ISelection,
} from 'office-ui-fabric-react/lib/MarqueeSelection'
import { Tooltip } from 'antd'
import { getValueFormat } from '@baurine/grafana-value-formats'

import CopyLink from '@lib/components/CopyLink'
import formatSql from '@lib/utils/sqlFormatter'
import {
  Card,
  Bar,
  TextWrap,
  Descriptions,
  ErrorBar,
  Expand,
  HighlightSQL,
  TextWithInfo,
  CardTable,
  ICardTableProps,
} from '@lib/components'
import { TopsqlPlanItem } from '@lib/client'

import type { SQLRecord } from '../TopSqlTable'
import { DetailContent } from './DetailContent'

interface TopSqlDetailTableProps {
  record: SQLRecord
}

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

  let tableProps: ICardTableProps = {
    cardNoMarginTop: true,
    getKey: (r: SQLRecord) => r.digest,
    items: records || [],
    columns: tableColumns,
  }

  const { selectedRecord, setSelectedRecord, selection } =
    useSelectedRecord(records)
  const handleRowClick = usePersistFn(
    (rec: PlanRecord, i: number, e: React.MouseEvent<HTMLElement>) => {
      setSelectedRecord(rec)
    }
  )

  if (isMultiPlans) {
    tableProps = {
      ...tableProps,
      selectionMode: SelectionMode.single,
      selection: selection as unknown as ISelection,
      selectionPreservedOnEmptyClick: true,
      onRowClicked: handleRowClick,
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

const usePlanRecord = (record: SQLRecord) => {
  // const isMultiPlans = record.plans.length > 1
  // const plans = [...record.plans]
  const isMultiPlans = true
  const plans = [...record.plans, { ...record.plans[0], plan_digest: 'aa' }]

  let totalCpuTime = 0
  const records: PlanRecord[] = plans.map((p) => {
    const cpuTime = p.cpu_time_millis?.reduce((pt, t) => pt + t, 0) || 0
    totalCpuTime += cpuTime
    return {
      ...p,
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
          plan_digest: '(Overall)',
          totalCpuTime: 0,
        } as PlanRecord
      )
    )

  return { isMultiPlans, records, totalCpuTime }
}

const canSelect = (r: PlanRecord): boolean => {
  return !!r.plan_digest && r.plan_digest !== '(Overall)'
}

const useSelectedRecord = (records: PlanRecord[]) => {
  const [record, setRecord] = useState<PlanRecord | null>(null)
  const handleSelect = useCallback(
    (r: PlanRecord | null) => {
      if (!!r && !canSelect(r)) {
        return
      }

      if (!r && !!record) {
        setRecord(null)
        return
      }

      const areDifferentRecords = !!r && r.plan_digest !== record?.plan_digest
      const isSelectedAndSameRecord =
        !!r && !!record && r.plan_digest === record.plan_digest
      if (areDifferentRecords && canSelect(r)) {
        setRecord(r)
      } else if (isSelectedAndSameRecord) {
        setRecord(null)
      }
    },
    [record]
  )

  // clear record when the sql is not in the table list
  useEffect(() => {
    if (!record) {
      return
    }

    const existed = !!records.find((r) => r.plan_digest === record.plan_digest)
    if (existed) {
      return
    }
    handleSelect(null)
  }, [records.map((r) => r.plan_digest).join(',')])

  const selection = useMemo(
    () =>
      new Selection<PlanRecord>({
        getKey: (rec) => rec.plan_digest!,
        selectionMode: SelectionMode.single,
        canSelectItem: (rec) => canSelect(rec),
      }),
    []
  )

  useEffect(() => {
    // selection won't set the selected item when records updated
    if (!!record && !selection.isKeySelected(record.plan_digest!)) {
      selection.selectToKey(record.plan_digest!)
    }

    // clear selected record
    const selectedRecord = selection.getSelection()[0]
    if (!record && !!selectedRecord) {
      selection.toggleKeySelected(selectedRecord.plan_digest!)
    }
  }, [record, records])

  return { selectedRecord: record, setSelectedRecord: handleSelect, selection }
}
