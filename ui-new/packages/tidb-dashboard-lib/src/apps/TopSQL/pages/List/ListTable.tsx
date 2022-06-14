import React, { useMemo } from 'react'
import { Tooltip } from 'antd'
import { getValueFormat } from '@baurine/grafana-value-formats'
import { useTranslation } from 'react-i18next'
import {
  SelectionMode,
  DetailsRow
} from 'office-ui-fabric-react/lib/DetailsList'
import { QuestionCircleOutlined } from '@ant-design/icons'

import { TopsqlSummaryItem } from '@lib/client'
import {
  Card,
  CardTable,
  Bar,
  TextWrap,
  HighlightSQL,
  AppearAnimate
} from '@lib/components'

import { useRecordSelection } from '../../utils/useRecordSelection'
import { ListDetail } from './ListDetail'
import { isOthersRecord, isUnknownSQLRecord } from '../../utils/specialRecord'
import { InstanceType } from './ListDetail/ListDetailTable'
import { useMemoizedFn } from 'ahooks'
import { telemetry } from '../../utils/telemetry'

interface ListTableProps {
  data: TopsqlSummaryItem[]
  topN: number
  instanceType: InstanceType
  onRowOver: (key: string) => void
  onRowLeave: () => void
}

const emptyFn = () => {}

export type SQLRecord = TopsqlSummaryItem & {
  cpuTime: number
}

export function ListTable({
  data,
  topN,
  instanceType,
  onRowLeave,
  onRowOver
}: ListTableProps) {
  const { t } = useTranslation()
  const { data: tableRecords, capacity } = useTableData(data)
  const tableColumns = useMemo(
    () => [
      {
        name: t('topsql.table.fields.cpu_time'),
        key: 'cpuTime',
        minWidth: 150,
        maxWidth: 250,
        onRender: (rec: SQLRecord) => (
          <Bar textWidth={80} value={rec.cpuTime!} capacity={capacity}>
            {getValueFormat('ms')(rec.cpuTime, 2)}
          </Bar>
        )
      },
      {
        name: t('topsql.table.fields.sql'),
        key: 'query',
        minWidth: 250,
        maxWidth: 550,
        onRender: (rec: SQLRecord) => {
          const text = isUnknownSQLRecord(rec)
            ? `(SQL ${rec.sql_digest?.slice(0, 8)})`
            : rec.sql_text!
          return isOthersRecord(rec) ? (
            <Tooltip
              title={t('topsql.table.others_tooltip', { topN })}
              placement="right"
            >
              <span
                style={{
                  verticalAlign: 'middle',
                  fontStyle: 'italic',
                  color: '#aaa'
                }}
                data-e2e="topsql_listtable_row_others"
              >
                {t('topsql.table.others')} <QuestionCircleOutlined />
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
        }
      }
    ],
    [capacity, t, topN]
  )

  const getKey = useMemoizedFn((r: SQLRecord) => r.sql_digest!)

  const { selectedRecord, selection } = useRecordSelection<SQLRecord>({
    storageKey: 'topsql.list_table_selected_key',
    selections: tableRecords,
    options: {
      getKey
    }
  })

  const onRenderRow = useMemoizedFn((props: any) => (
    <div
      onMouseEnter={() => onRowOver(props.item.sql_digest)}
      onMouseLeave={onRowLeave}
      onClick={() =>
        telemetry.clickStatement(props.itemIndex, props.itemIndex === topN)
      }
    >
      <DetailsRow {...props} />
    </div>
  ))

  return tableRecords.length ? (
    <>
      <Card noMarginBottom noMarginTop>
        <p className="ant-form-item-extra">
          {t('topsql.table.description', { topN })}
        </p>
      </Card>
      <CardTable
        listProps={
          {
            'data-e2e': 'topsql_list_table'
          } as any
        }
        cardNoMarginTop
        cardNoMarginBottom
        getKey={getKey}
        items={tableRecords || []}
        columns={tableColumns}
        selection={selection}
        selectionMode={SelectionMode.single}
        selectionPreservedOnEmptyClick
        onRowClicked={emptyFn}
        onRenderRow={onRenderRow}
      />
      <AppearAnimate motionName="contentAnimation">
        {selectedRecord && (
          <ListDetail
            instanceType={instanceType}
            record={selectedRecord}
            capacity={capacity}
          />
        )}
      </AppearAnimate>
    </>
  ) : null
}

function useTableData(records: TopsqlSummaryItem[]) {
  const tableData: { data: SQLRecord[]; capacity: number } = useMemo(() => {
    if (!records) {
      return { data: [], capacity: 0 }
    }
    let capacity = 0
    const d = records
      .map((r) => {
        let cpuTime = 0
        r.plans?.forEach((plan) => {
          plan.timestamp_sec?.forEach((t, i) => {
            cpuTime += plan.cpu_time_ms![i]
          })
        })

        if (capacity < cpuTime) {
          capacity = cpuTime
        }

        return {
          ...r,
          cpuTime,
          plans: r.plans || []
        }
      })
      .filter((r) => !!r.cpuTime)
      .sort((a, b) => b.cpuTime - a.cpuTime)
      .sort((a, b) => (b.is_other ? -1 : 0))
    return { data: d, capacity }
  }, [records])

  return tableData
}
