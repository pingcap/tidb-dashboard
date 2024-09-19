import React, { useContext, useMemo } from 'react'
import { Tooltip, Typography } from 'antd'
import { getValueFormat } from '@baurine/grafana-value-formats'
import { useTranslation } from 'react-i18next'
import {
  SelectionMode,
  DetailsRow
} from 'office-ui-fabric-react/lib/DetailsList'
import { QuestionCircleOutlined } from '@ant-design/icons'
import { CSVLink } from 'react-csv'

import { TopsqlSummaryItem, TopsqlSummaryByItem } from '@lib/client'
import {
  Card,
  CardTable,
  Bar,
  TextWrap,
  HighlightSQL,
  AppearAnimate,
  TimeRange,
  toTimeRangeValue
} from '@lib/components'

import { useRecordSelection } from '../../utils/useRecordSelection'
import { ListDetail } from './ListDetail'
import {
  isOthersRecord,
  isSummaryByRecord,
  isUnknownSQLRecord
} from '../../utils/specialRecord'
import { InstanceType } from './ListDetail/ListDetailTable'
import { useMemoizedFn } from 'ahooks'
import { telemetry } from '../../utils/telemetry'
import openLink from '@lib/utils/openLink'
import { useNavigate } from 'react-router-dom'
import { TopSQLContext } from '../../context'
import { AggLevel } from './List'

interface ListTableProps {
  data: any[]
  groupBy: string
  topN: number
  instanceType: InstanceType
  timeRange: TimeRange
  onRowOver: (key: string) => void
  onRowLeave: () => void
}

const emptyFn = () => {}

export type SQLRecord = TopsqlSummaryItem &
  TopsqlSummaryByItem & {
    cpuTime: number
  }

function isConvertNumber(value: string): boolean {
  let res = !isNaN(Number(value))
  return res
}

export function ListTable({
  data,
  groupBy,
  topN,
  instanceType,
  timeRange,
  onRowLeave,
  onRowOver
}: ListTableProps) {
  const { t } = useTranslation()
  const { data: tableRecords, capacity } = useTableData(data)
  const navigate = useNavigate()
  const ctx = useContext(TopSQLContext)

  const tableColumns = useMemo(() => {
    function goDetail(ev: React.MouseEvent<HTMLElement>, record: SQLRecord) {
      const sv = sessionStorage.getItem('statement.query_options')
      if (sv) {
        const queryOptions = JSON.parse(sv)
        queryOptions.searchText = record.sql_digest
        sessionStorage.setItem(
          'statement.query_options',
          JSON.stringify(queryOptions)
        )
      }

      const tv = toTimeRangeValue(timeRange)
      openLink(`/statement?from=${tv[0]}&to=${tv[1]}`, ev, navigate)
    }
    let cols = [
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
        name:
          groupBy === AggLevel.Table
            ? t('topsql.table.fields.table')
            : groupBy === AggLevel.Schema
            ? t('topsql.table.fields.db')
            : t('topsql.table.fields.sql'),
        key:
          groupBy === AggLevel.Table || groupBy === AggLevel.Schema
            ? 'text'
            : 'sql_text',
        minWidth: 250,
        maxWidth: 550,
        onRender: (rec: SQLRecord) => {
          let text = rec.text
            ? rec.text
            : isUnknownSQLRecord(rec)
            ? `(SQL ${rec.sql_digest?.slice(0, 8)})`
            : rec.sql_text!

          // parser the table name if the text is like "tableId-tableName"
          text =
            text.includes('-') && text.split('-').length > 1
              ? isConvertNumber(text.split('-')[0])
                ? text.split('-')[1] + ' ( tid =' + text.split('-')[0] + ' )'
                : text
              : text
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
      },
      {
        name: '',
        key: 'actions',
        minWidth: 200,
        // maxWidth: 200,
        onRender: (rec) => {
          if (!isOthersRecord(rec) && !isSummaryByRecord(rec)) {
            return (
              <Typography.Link onClick={(ev) => goDetail(ev, rec)}>
                {t('topsql.table.actions.search_in_statements')}
              </Typography.Link>
            )
          }
          return null
        }
      }
    ]
    if (ctx?.cfg.showSearchInStatements === false) {
      cols = cols.filter((c) => c.key !== 'actions')
    }
    return cols
  }, [
    capacity,
    t,
    topN,
    groupBy,
    navigate,
    timeRange,
    ctx?.cfg.showSearchInStatements
  ])

  const csvHeaders = tableColumns
    .slice(0, 2)
    .map((c) => ({ label: c.name, key: c.key }))

  const getKey = useMemoizedFn((r: SQLRecord) => r?.sql_digest ?? r?.text ?? '')

  const { selectedRecord, selection } = useRecordSelection<SQLRecord>({
    storageKey: 'topsql.list_table_selected_key',
    selections: tableRecords,
    options: {
      getKey,
      canSelectItem: (r) => !isSummaryByRecord(r)
    }
  })
  const onRenderRow = useMemoizedFn((props: any) => (
    <div
      onMouseEnter={() => onRowOver(props.item?.sql_digest ?? props.item?.text)}
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
        <div className="ant-form-item-extra">
          {t('topsql.table.description', { topN })}{' '}
          <CSVLink
            data={tableRecords || []}
            headers={csvHeaders}
            filename="topsql"
          >
            Download to CSV
          </CSVLink>
        </div>
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
        {selectedRecord &&
          groupBy !== AggLevel.Table &&
          groupBy !== AggLevel.Schema && (
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

function useTableData(records: any[]) {
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

        if (r.cpu_time_ms_sum && (r.text?.length ?? 0) > 0) {
          cpuTime = r.cpu_time_ms_sum
        }

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
