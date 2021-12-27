import React, { useMemo } from 'react'
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
import { useSelectedRecord } from '../../utils/useSelectedRecord'
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
  const { data: tableRecords, capacity } = useTableData(data)
  const tableColumns = useMemo(
    () => [
      {
        name: 'CPU',
        key: 'cpuTime',
        minWidth: 150,
        maxWidth: 250,
        onRender: (rec) => (
          <Bar textWidth={80} value={rec.cpuTime!} capacity={capacity}>
            {getValueFormat('ms')(rec.cpuTime, 2)}
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
    [capacity]
  )

  const { getSelectedRecord, setSelectedRecord, selection } =
    useSelectedRecord<SQLRecord>({
      selections: tableRecords,
      getKey: (r) => r.digest,
      disableSelection: (r) => !canSelect(r),
    })

  return (
    <>
      <Card noMarginBottom noMarginTop>
        <p className="ant-form-item-extra">{t('topsql.table.description')}</p>
      </Card>
      <CardTable
        cardNoMarginTop
        cardNoMarginBottom
        getKey={(r: SQLRecord) => r.digest}
        items={tableRecords || []}
        columns={tableColumns}
        selection={selection}
        selectionMode={SelectionMode.single}
        selectionPreservedOnEmptyClick={true}
        onRowClicked={setSelectedRecord}
        onRenderRow={unselectableRow}
      />
      {getSelectedRecord() && (
        <AppearAnimate motionName="contentAnimation">
          <ListDetail record={getSelectedRecord()!} />
        </AppearAnimate>
      )}
    </>
  )
}

function useTableData(records: TopsqlCPUTimeItem[]) {
  const tableData: { data: SQLRecord[]; capacity: number } = useMemo(() => {
    if (!records) {
      return { data: [], capacity: 0 }
    }
    let capacity = 0
    const d = records
      .map((r) => {
        let cpuTime = 0
        r.plans?.forEach((plan) => {
          plan.timestamp_secs?.forEach((t, i) => {
            cpuTime += plan.cpu_time_millis![i]
          })
        })

        if (capacity < cpuTime) {
          capacity = cpuTime
        }

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
    return { data: d, capacity }
  }, [records])

  return tableData
}
