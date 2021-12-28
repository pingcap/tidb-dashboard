import React, { useMemo } from 'react'
import { SelectionMode } from 'office-ui-fabric-react/lib/DetailsList'
import { Tooltip } from 'antd'
import { getValueFormat } from '@baurine/grafana-value-formats'

import {
  Bar,
  TextWrap,
  CardTable,
  createUnselectableRow,
} from '@lib/components'
import { TopsqlPlanItem } from '@lib/client'

import type { SQLRecord } from '../ListTable'
import { ListDetailContent } from './ListDetailContent'
import { useSelectedRecord } from '../../../utils/useSelectedRecord'
import {
  convertOthersPlanRecord,
  isOthersPlanRecord,
} from '@lib/apps/TopSQL/utils/othersRecord'

interface ListDetailTableProps {
  record: SQLRecord
}

const OVERALL_LABEL = '(Overall)'

const canSelect = (r: PlanRecord): boolean => {
  return (
    !!r.plan_digest && r.plan_digest !== OVERALL_LABEL && !isOthersPlanRecord(r)
  )
}

const unselectableRow = createUnselectableRow(
  (props) => !canSelect(props.item),
  (props) =>
    props.item.plan_digest === OVERALL_LABEL
      ? // overall
        { backgroundColor: '#fff' }
      : // others
        { backgroundColor: '#fff', fontStyle: 'italic' }
)

export function ListDetailTable({ record: sqlRecord }: ListDetailTableProps) {
  const {
    records: planRecords,
    isMultiPlans,
    capacity,
  } = usePlanRecord(sqlRecord || [])

  const tableColumns = useMemo(
    () => [
      {
        name: 'CPU',
        key: 'cpuTime',
        minWidth: 150,
        maxWidth: 250,
        onRender: (rec: PlanRecord) => (
          <Bar textWidth={80} value={rec.cpuTime!} capacity={capacity}>
            {getValueFormat('ms')(rec.cpuTime, 2)}
          </Bar>
        ),
      },
      {
        name: 'Plan',
        key: 'plan',
        minWidth: 80,
        maxWidth: 80,
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
    [capacity]
  )

  const { getSelectedRecord, setSelectedRecord, selection } =
    useSelectedRecord<PlanRecord>({
      selections: planRecords,
      getKey: (r) => r.plan_digest!,
      disableSelection: (r) => !canSelect(r),
    })

  const planRecord = useMemo(() => {
    if (isMultiPlans) {
      return getSelectedRecord()
    }

    return planRecords[0]
  }, [planRecords])

  return (
    <>
      <CardTable
        cardNoMarginTop
        getKey={(r: PlanRecord) => r?.plan_digest!}
        items={planRecords}
        columns={tableColumns}
        onRenderRow={unselectableRow}
        selectionMode={isMultiPlans ? SelectionMode.single : SelectionMode.none}
        selectionPreservedOnEmptyClick
        onRowClicked={isMultiPlans ? setSelectedRecord : undefined}
        selection={selection}
      />
      <ListDetailContent sqlRecord={sqlRecord} planRecord={planRecord} />
    </>
  )
}

export type PlanRecord = {
  cpuTime: number
} & TopsqlPlanItem

const usePlanRecord = (
  record: SQLRecord
): { isMultiPlans: boolean; records: PlanRecord[]; capacity: number } => {
  if (!record?.plans?.length) {
    return { isMultiPlans: false, records: [], capacity: 0 }
  }

  const isMultiPlans = record.plans.length > 1
  const plans = [...record.plans]

  const records: PlanRecord[] = plans
    .map((p) => {
      const cpuTime = p.cpu_time_millis?.reduce((pt, t) => pt + t, 0) || 0
      convertOthersPlanRecord(p)
      return {
        ...p,
        cpuTime,
      }
    })
    .sort((a, b) => (isOthersPlanRecord(b) ? -1 : 0))

  // add overall
  if (isMultiPlans) {
    records.unshift(
      records.reduce(
        (prev, current) => {
          prev.cpuTime += current.cpuTime
          return prev
        },
        {
          plan_digest: OVERALL_LABEL,
          cpuTime: 0,
        } as PlanRecord
      )
    )
  }

  const capacity = records.reduce((prev, current) => {
    return (prev += current.cpuTime)
  }, 0)

  return { isMultiPlans, records, capacity }
}
