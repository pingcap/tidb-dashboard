import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { Tooltip } from 'antd'
import { getValueFormat } from '@baurine/grafana-value-formats'
import { useTranslation } from 'react-i18next'
import { usePersistFn } from 'ahooks'
import {
  SelectionMode,
  Selection,
} from 'office-ui-fabric-react/lib/DetailsList'
import {
  MarqueeSelection,
  ISelection,
} from 'office-ui-fabric-react/lib/MarqueeSelection'

import { TopsqlCPUTimeItem, TopsqlPlanItem } from '@lib/client'
import { Card, CardTable, Bar, TextWrap, HighlightSQL } from '@lib/components'

import { isOthers } from './useOthers'
import { TopSqlDetail } from './Detail'

interface TopSqlTableProps {
  data: TopsqlCPUTimeItem[]
  timeRange: [number, number] | undefined
}

export interface SQLRecord {
  key: string
  query: string
  digest: string
  cpuTime: number
  plans: TopsqlPlanItem[]
}

export function TopSqlTable({ data, timeRange }: TopSqlTableProps) {
  const { t } = useTranslation()
  const { data: tableRecords, totalCpuTime } = useTableData(data, timeRange)
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
            ? isOthers(rec.digest)
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

  const { selectedRecord, setSelectedRecord, selection } =
    useSelectedRecord(tableRecords)
  const handleRowClick = usePersistFn(
    (rec: SQLRecord, i: number, e: React.MouseEvent<HTMLElement>) => {
      setSelectedRecord(rec)
    }
  )

  return (
    <Card>
      <p className="ant-form-item-extra" style={{ marginBottom: '30px' }}>
        {t('top_sql.table.description')}
      </p>
      <MarqueeSelection
        selection={selection as unknown as ISelection}
        isEnabled={false}
      >
        <CardTable
          cardNoMarginTop
          getKey={(r: SQLRecord) => r.digest}
          items={tableRecords || []}
          columns={tableColumns}
          selectionMode={SelectionMode.single}
          selection={selection as unknown as ISelection}
          selectionPreservedOnEmptyClick={true}
          onRowClicked={handleRowClick}
        />
      </MarqueeSelection>
      {selectedRecord && <TopSqlDetail record={selectedRecord} />}
    </Card>
  )
}

function useTableData(
  records: TopsqlCPUTimeItem[],
  timeRange: [number, number] | undefined
) {
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
            if (timeRange && (t < timeRange[0] || t > timeRange[1])) {
              return
            }
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
      .sort((a, b) => (isOthers(b.digest) ? -1 : 0))
    return { data: d, totalCpuTime }
  }, [records, timeRange])

  return tableData
}

const canSelect = (r: SQLRecord): boolean => {
  return !!r.digest && !isOthers(r.digest)
}

const useSelectedRecord = (records: SQLRecord[]) => {
  const [record, setRecord] = useState<SQLRecord | null>(null)
  const handleSelect = useCallback(
    (r: SQLRecord | null) => {
      if (!r && !!record) {
        setRecord(null)
        return
      }

      const areDifferentRecords = !!r && r.digest !== record?.digest
      const isSelectedAndSameRecord =
        !!r && !!record && r.digest === record.digest
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

    const existed = !!records.find((r) => r.digest === record.digest)
    if (existed) {
      return
    }
    handleSelect(null)
  }, [records.map((r) => r.digest).join(',')])

  const selection = useMemo(
    () =>
      new Selection<SQLRecord>({
        getKey: (rec) => rec.digest,
        selectionMode: SelectionMode.single,
        canSelectItem: (rec) => canSelect(rec),
      }),
    []
  )

  useEffect(() => {
    // selection won't set the selected item when records updated
    if (!!record && !selection.isKeySelected(record.digest)) {
      selection.selectToKey(record?.digest)
    }

    // clear selected record
    const selectedRecord = selection.getSelection()[0]
    if (!record && !!selectedRecord) {
      selection.toggleKeySelected(selectedRecord.digest)
    }
  }, [record, records])

  return { selectedRecord: record, setSelectedRecord: handleSelect, selection }
}
