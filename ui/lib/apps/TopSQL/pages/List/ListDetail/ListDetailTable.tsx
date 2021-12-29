import React, { useEffect, useMemo } from 'react'
import { SelectionMode } from 'office-ui-fabric-react/lib/DetailsList'
import { Tooltip } from 'antd'
import { getValueFormat } from '@baurine/grafana-value-formats'

import { Bar, TextWrap, CardTable } from '@lib/components'
import { TopsqlPlanItem } from '@lib/client'

import type { SQLRecord } from '../ListTable'
import { ListDetailContent } from './ListDetailContent'
import { useRecordSelection } from '../../../utils/useRecordSelection'

interface ListDetailTableProps {
  record: SQLRecord
  capacity: number
}

const OVERALL_LABEL = '(Overall)'
const UNKNOWN_LABEL = 'Unknown'

const canSelect = (r: PlanRecord): boolean => {
  return !!r.plan_digest && r.plan_digest !== OVERALL_LABEL
}

export function ListDetailTable({
  record: sqlRecord,
  capacity,
}: ListDetailTableProps) {
  const { records: planRecords, isMultiPlans } = usePlanRecord(sqlRecord)

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
          return rec.plan_digest === OVERALL_LABEL ? (
            rec.plan_digest
          ) : (
            <Tooltip title={rec.plan_digest} placement="right">
              <TextWrap>{rec.plan_digest || UNKNOWN_LABEL}</TextWrap>
            </Tooltip>
          )
        },
      },
    ],
    [capacity]
  )

  const { selectedRecord, selection } = useRecordSelection<PlanRecord>({
    localStorageKey: 'topsql.list_detail_table_selected_key',
    selections: planRecords,
    getKey: (r) => r.plan_digest!,
    disableSelection: (r) => !canSelect(r),
  })

  const planRecord = useMemo(() => {
    if (isMultiPlans) {
      return selectedRecord
    }

    return planRecords[0]
  }, [planRecords, isMultiPlans])

  return (
    <>
      <CardTable
        cardNoMarginTop
        getKey={(r: PlanRecord) => r?.plan_digest!}
        items={planRecords}
        columns={tableColumns}
        selectionMode={isMultiPlans ? SelectionMode.single : SelectionMode.none}
        selectionPreservedOnEmptyClick
        onRowClicked={isMultiPlans ? () => {} : undefined}
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
): { isMultiPlans: boolean; records: PlanRecord[] } => {
  return useMemo(() => {
    if (!record?.plans?.length) {
      return { isMultiPlans: false, records: [] }
    }

    const isMultiPlans = record.plans.length > 1
    // const isMultiPlans = true
    const plans = [...record.plans]

    const records: PlanRecord[] = plans.map((p) => {
      const cpuTime = p.cpu_time_millis?.reduce((pt, t) => pt + t, 0) || 0
      return {
        ...p,
        cpuTime,
      }
    })

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

    return { isMultiPlans, records }
  }, [record])
}
