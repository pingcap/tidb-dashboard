import React, { useMemo } from 'react'
import { Tooltip } from 'antd'
import { getValueFormat } from '@baurine/grafana-value-formats'
import { useTranslation } from 'react-i18next'
import { SelectionMode } from 'office-ui-fabric-react/lib/DetailsList'
import { QuestionCircleOutlined } from '@ant-design/icons'

import { TopsqlCPUTimeItem, TopsqlPlanItem } from '@lib/client'
import {
  Card,
  CardTable,
  Bar,
  TextWrap,
  HighlightSQL,
  AppearAnimate,
} from '@lib/components'

import { isOthersRecord } from '../../utils/othersRecord'
import { useRecordSelection } from '../../utils/useRecordSelection'
import { ListDetail } from './ListDetail'

interface ListTableProps {
  data: TopsqlCPUTimeItem[]
  topN: number
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

export function ListTable({ data, topN }: ListTableProps) {
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
          const isOthers = isOthersRecord(rec)
          const text = rec.query || 'Unknown'
          return isOthers ? (
            <Tooltip
              title={t('topsql.table.others_tooltip', { topN })}
              placement="right"
            >
              <span
                style={{
                  verticalAlign: 'middle',
                  fontStyle: 'italic',
                  color: '#aaa',
                }}
              >
                {text} <QuestionCircleOutlined />
              </span>
            </Tooltip>
          ) : (
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

  const { selectedRecordKey, selectRecord, selection } =
    useRecordSelection<SQLRecord>({
      selections: tableRecords,
      getKey: (r) => r.digest,
      disableSelection: (r) => !canSelect(r),
    })
  const selectedRecord = useMemo(
    () => tableRecords.find((r) => r.digest === selectedRecordKey),
    [tableRecords, selectedRecordKey]
  )

  return (
    <>
      <Card noMarginBottom noMarginTop>
        <p className="ant-form-item-extra">
          {t('topsql.table.description', { topN })}
        </p>
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
        onRowClicked={selectRecord}
      />
      {!!selectedRecord && (
        <AppearAnimate motionName="contentAnimation">
          <ListDetail record={selectedRecord} capacity={capacity} />
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
