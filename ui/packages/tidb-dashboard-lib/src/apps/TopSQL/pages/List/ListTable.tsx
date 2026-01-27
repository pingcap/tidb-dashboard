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
import { AggLevel, OrderBy } from './List'

interface ListTableProps {
  data: any[]
  groupBy: string
  orderBy: OrderBy
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
    networkBytes?: number
    logicalIoBytes?: number
  }

function isConvertNumber(value: string): boolean {
  let res = !isNaN(Number(value))
  return res
}

export function ListTable({
  data,
  groupBy,
  orderBy,
  topN,
  instanceType,
  timeRange,
  onRowLeave,
  onRowOver
}: ListTableProps) {
  const { t } = useTranslation()
  const { data: tableRecords, capacity } = useTableData(data, orderBy)
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
    // Get column title and value based on orderBy
    const getColumnTitle = () => {
      switch (orderBy) {
        case OrderBy.NetworkBytes:
          return t('topsql.table.fields.network_bytes') || 'Network Bytes'
        case OrderBy.LogicalIoBytes:
          return t('topsql.table.fields.logical_io_bytes') || 'Logical IO Bytes'
        case OrderBy.CpuTime:
        default:
          return t('topsql.table.fields.cpu_time')
      }
    }

    const getColumnValue = (rec: SQLRecord): number => {
      switch (orderBy) {
        case OrderBy.NetworkBytes:
          return rec.networkBytes || 0
        case OrderBy.LogicalIoBytes:
          return rec.logicalIoBytes || 0
        case OrderBy.CpuTime:
        default:
          return rec.cpuTime || 0
      }
    }

    const getValueFormatter = () => {
      switch (orderBy) {
        case OrderBy.NetworkBytes:
        case OrderBy.LogicalIoBytes:
          return (v: number) => getValueFormat('bytes')(v, 2)
        case OrderBy.CpuTime:
        default:
          return (v: number) => getValueFormat('ms')(v, 2)
      }
    }

    const formatter = getValueFormatter()
    let cols = [
      {
        name: getColumnTitle(),
        key:
          orderBy === OrderBy.NetworkBytes
            ? 'networkBytes'
            : orderBy === OrderBy.LogicalIoBytes
            ? 'logicalIoBytes'
            : 'cpuTime',
        minWidth: 150,
        maxWidth: 250,
        onRender: (rec: SQLRecord) => {
          const value = getColumnValue(rec)
          return (
            <Bar textWidth={80} value={value} capacity={capacity}>
              {formatter(value)}
            </Bar>
          )
        }
      },
      {
        name:
          groupBy === AggLevel.Table
            ? t('topsql.table.fields.table')
            : groupBy === AggLevel.Schema
            ? t('topsql.table.fields.db')
            : groupBy === AggLevel.Region
            ? 'RegionID'
            : t('topsql.table.fields.sql'),
        key:
          groupBy === AggLevel.Table ||
          groupBy === AggLevel.Schema ||
          groupBy === AggLevel.Region
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
              title={<HighlightSQL sql={text} theme="dark" maxLen={1000} />}
              placement="right"
            >
              <TextWrap>
                <HighlightSQL sql={text} compact maxLen={1000} />
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
    orderBy,
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
          groupBy !== AggLevel.Schema &&
          groupBy !== AggLevel.Region && (
            <ListDetail
              instanceType={instanceType}
              record={selectedRecord}
              capacity={capacity}
              orderBy={orderBy}
            />
          )}
      </AppearAnimate>
    </>
  ) : null
}

function useTableData(records: any[], orderBy: OrderBy) {
  const tableData: { data: SQLRecord[]; capacity: number } = useMemo(() => {
    if (!records) {
      return { data: [], capacity: 0 }
    }
    const sum = (arr?: Array<number>): number =>
      (arr ?? []).reduce((acc, v) => acc + (v || 0), 0)

    let capacity = 0
    const d = records
      .map((r) => {
        let cpuTime = 0
        let networkBytes = 0
        let logicalIoBytes = 0

        r.plans?.forEach((plan: any) => {
          plan.timestamp_sec?.forEach((t: number, i: number) => {
            cpuTime += plan.cpu_time_ms?.[i] || 0
            // network_bytes and logical_io_bytes might be arrays similar to cpu_time_ms
            networkBytes += plan.network_bytes?.[i] || 0
            logicalIoBytes += plan.logical_io_bytes?.[i] || 0
          })
        })

        // For SummaryByItem (groupBy table / schema / region)
        // Note: backend may omit unrelated fields depending on orderBy, so avoid using
        // cpu_time_ms_sum as the "is summary-by" guard.
        if ((r.text?.length ?? 0) > 0) {
          cpuTime = r.cpu_time_ms_sum ?? sum(r.cpu_time_ms)
          networkBytes = r.network_bytes_sum ?? sum(r.network_bytes)
          logicalIoBytes = r.logical_io_bytes_sum ?? sum(r.logical_io_bytes)
        }

        // Calculate capacity based on the selected orderBy dimension
        let sortValue = 0
        switch (orderBy) {
          case OrderBy.CpuTime:
            sortValue = cpuTime
            break
          case OrderBy.NetworkBytes:
            sortValue = networkBytes
            break
          case OrderBy.LogicalIoBytes:
            sortValue = logicalIoBytes
            break
        }

        if (capacity < sortValue) {
          capacity = sortValue
        }

        return {
          ...r,
          cpuTime,
          networkBytes,
          logicalIoBytes,
          plans: r.plans || []
        }
      })
      .filter((r) => {
        // Filter based on the selected orderBy dimension
        switch (orderBy) {
          case OrderBy.CpuTime:
            return !!r.cpuTime
          case OrderBy.NetworkBytes:
            return !!r.networkBytes
          case OrderBy.LogicalIoBytes:
            return !!r.logicalIoBytes
          default:
            return !!r.cpuTime
        }
      })
      .sort((a, b) => {
        // Sort based on the selected orderBy dimension
        let aValue = 0
        let bValue = 0
        switch (orderBy) {
          case OrderBy.CpuTime:
            aValue = a.cpuTime
            bValue = b.cpuTime
            break
          case OrderBy.NetworkBytes:
            aValue = a.networkBytes || 0
            bValue = b.networkBytes || 0
            break
          case OrderBy.LogicalIoBytes:
            aValue = a.logicalIoBytes || 0
            bValue = b.logicalIoBytes || 0
            break
        }
        return bValue - aValue
      })
      .sort((a, b) => (b.is_other ? -1 : 0))
    return { data: d, capacity }
  }, [records, orderBy])
  return tableData
}
