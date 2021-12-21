import React, { useState, useMemo, useCallback } from 'react'
import { Tooltip } from 'antd'
import { getValueFormat } from '@baurine/grafana-value-formats'
import { useTranslation } from 'react-i18next'
import { SelectionMode } from 'office-ui-fabric-react/lib/DetailsList'

import { TopsqlCPUTimeItem, TopsqlPlanItem } from '@lib/client'
import {
  Card,
  CardTable,
  Bar,
  TextWrap,
  HighlightSQL,
  AppearAnimate,
  createUnselectableRow,
} from '@lib/components'

import { isOthersRecord } from '../../utils/othersRecord'
import { ListDetail } from './ListDetail'

interface ListTableProps {
  data: TopsqlCPUTimeItem[]
}

export interface SQLRecord {
  key: string
  query: string
  digest: string
  cpuTime: number
  plans: TopsqlPlanItem[]
}

const canSelect = (r: SQLRecord): boolean => {
  return !!r.digest && !isOthersRecord(r)
}

const unselectableRow = createUnselectableRow((props) => !canSelect(props.item))

export function ListTable({ data }: ListTableProps) {
  const { t } = useTranslation()
  const { data: tableRecords, totalCpuTime } = useTableData(data)
  const tableColumns = useMemo(
    () => [
      {
        name: 'CPU',
        key: 'cpuTime',
        minWidth: 150,
        maxWidth: 250,
        onRender: (rec) => (
          <Bar textWidth={70} value={rec.cpuTime!} capacity={totalCpuTime}>
            {getValueFormat('ms')(rec.cpuTime, 0, 0)}
          </Bar>
        ),
      },
      {
        name: 'Query',
        key: 'query',
        minWidth: 250,
        maxWidth: 550,
        onRender: (rec) => {
          const text = rec.query
            ? isOthersRecord(rec)
              ? ''
              : rec.query
            : 'Unknown'
          return (
            <Tooltip
              title={<HighlightSQL sql={text} theme="dark" />}
              placement="right"
            >
              <TextWrap>
                <HighlightSQL sql={text} compact />
              </TextWrap>
            </Tooltip>
          )
        },
      },
    ],
    [totalCpuTime]
  )

  const { selectedRecord, setSelectedRecord } = useSelectedRecord()

  return (
    <Card>
      <p className="ant-form-item-extra" style={{ marginBottom: '30px' }}>
        {t('top_sql.table.description')}
      </p>
      <CardTable
        cardNoMarginTop
        getKey={(r: SQLRecord) => r.digest}
        items={tableRecords || []}
        columns={tableColumns}
        selectionMode={SelectionMode.single}
        selectionPreservedOnEmptyClick={true}
        onRowClicked={setSelectedRecord}
        onRenderRow={unselectableRow}
      />
      {selectedRecord && (
        <AppearAnimate motionName="contentAnimation">
          <ListDetail record={selectedRecord} />
        </AppearAnimate>
      )}
    </Card>
  )
}

function useTableData(records: TopsqlCPUTimeItem[]) {
  const tableData: { data: SQLRecord[]; totalCpuTime: number } = useMemo(() => {
    if (!records) {
      return { data: [], totalCpuTime: 0 }
    }
    let totalCpuTime = 0
    const d = records
      .map((r) => {
        let cpuTime = 0
        r.plans?.forEach((plan) => {
          plan.timestamp_secs?.forEach((t, i) => {
            cpuTime += plan.cpu_time_millis![i]
          })
        })
        totalCpuTime += cpuTime
        return {
          key: r.sql_digest!,
          cpuTime,
          query: r.sql_text!,
          digest: r.sql_digest!,
          plans: r.plans || [],
        }
      })
      .filter((r) => !!r.cpuTime)
      .sort((a, b) => b.cpuTime - a.cpuTime)
      .sort((a, b) => (isOthersRecord(b) ? -1 : 0))
    return { data: d, totalCpuTime }
  }, [records])

  return tableData
}

const useSelectedRecord = () => {
  const [record, setRecord] = useState<SQLRecord | null>(null)
  const handleSelect = useCallback(
    (r: SQLRecord | null) => {
      if (!!r && !canSelect(r)) {
        return
      }

      const areDifferentRecords = !!r && r.digest !== record?.digest
      if (areDifferentRecords) {
        setRecord(r)
        return
      }
    },
    [record, setRecord]
  )

  return { selectedRecord: record, setSelectedRecord: handleSelect }
}
