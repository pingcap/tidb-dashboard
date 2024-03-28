import React, { useRef, useMemo } from 'react'
import { Space, Select, Typography, Button, Tag, Skeleton } from 'antd'
import { CaretLeftOutlined, CaretRightOutlined } from '@ant-design/icons'
import {
  Card,
  TimeRangeValue,
  fromTimeRangeValue,
  toTimeRangeValue
} from '@lib/components'

import styles from './List.module.less'
import { useTopSlowQueryContext } from '../context'
import { Link } from 'react-router-dom'
import { useTopSlowQueryUrlState } from '../uilts/url-state'
import { DEFAULT_TIME_RANGE, DURATIONS, ORDER_BY } from '../uilts/helpers'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { TopSlowQueryListTable } from './ListTable'
import { CountChart } from './CountChart'

export function TopSlowQueryList() {
  const containerRef = useRef<HTMLDivElement>(null)

  return (
    <div className={styles.container} ref={containerRef}>
      <Card noMarginBottom>
        <ClusterInfoHeader />
      </Card>

      <Card noMarginTop>
        <TimeWindowSelect />
        <SlowQueryCountChart />

        <Typography.Title level={5}>Top 10</Typography.Title>
        <TopSlowQueryFilters />
        <TopSlowQueryListTable />
      </Card>
    </div>
  )
}

function ClusterInfoHeader() {
  const ctx = useTopSlowQueryContext()
  // only for clinic
  const clusterInfo = useMemo(() => {
    const infos: string[] = []
    if (ctx?.cfg.orgName) {
      infos.push(`Org: ${ctx?.cfg.orgName}`)
    }
    if (ctx?.cfg.clusterName) {
      infos.push(`Cluster: ${ctx?.cfg.clusterName}`)
    }
    return infos.join(' | ')
  }, [ctx?.cfg.orgName, ctx?.cfg.clusterName])

  if (!clusterInfo) return null

  return (
    <div
      style={{
        marginBottom: 16,
        display: 'flex',
        flexDirection: 'row-reverse',
        justifyContent: 'space-between'
      }}
    >
      {clusterInfo}
      <span>
        <span style={{ fontSize: 18, fontWeight: 600 }}>
          <Link to="/slow_query">Slow Query Logs</Link>
          <span> | </span>
          <span>Top SlowQueries </span>
        </span>
        <Tag color="geekblue">beta</Tag>
      </span>
    </div>
  )
}

function useTimeWindows() {
  const ctx = useTopSlowQueryContext()
  const { duration, tw, setTw, timeRange } = useTopSlowQueryUrlState()

  const query = useQuery({
    queryKey: [
      'top_slowquery_time_windows',
      duration,
      timeRange,
      ctx.cfg.orgName,
      ctx.cfg.clusterName
    ],
    queryFn: () => {
      const timeVal = toTimeRangeValue(timeRange)
      return ctx.api.getAvailableTimeWindows({
        from: timeVal[0],
        to: timeVal[1],
        duration
      })
    },
    onSuccess(data) {
      if (data.length === 0) {
        return
      }
      if (data.some((d) => d.begin_time === tw[0] && d.end_time === tw[1])) {
        return
      }
      setTw(`${data[0].begin_time}-${data[0].end_time}`)
    }
  })
  return query
}

const timezone = dayjs().format('UTCZ')
function TimeWindowSelect() {
  const { duration, setDurationAndTimeRange, tw, setTw } =
    useTopSlowQueryUrlState()
  const { data: availableTimeWindows } = useTimeWindows()

  function newerTw() {
    if (!availableTimeWindows) {
      return
    }
    const idx = availableTimeWindows.findIndex(
      (item) => item.begin_time === tw[0] && item.end_time === tw[1]
    )
    if (idx === -1 || idx === 0) {
      return
    }
    const item = availableTimeWindows[idx - 1]
    setTw(`${item.begin_time}-${item.end_time}`)
  }

  function olderTw() {
    if (!availableTimeWindows) {
      return
    }
    const idx = availableTimeWindows.findIndex(
      (item) => item.begin_time === tw[0] && item.end_time === tw[1]
    )
    if (idx === -1 || idx === availableTimeWindows.length - 1) {
      return
    }
    const item = availableTimeWindows[idx + 1]
    setTw(`${item.begin_time}-${item.end_time}`)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {/*
        <div>
          <span>Time Range: </span>
          <TimeRangeSelector
            value={timeRange}
            onChange={setTimeRange}
            recent_seconds={TIME_RANGE_RECENT_SECONDS}
          />
        </div>
      */}

      <div>
        <span>Duration: </span>
        <Select
          style={{ width: 128 }}
          value={duration}
          onChange={(v) => setDurationAndTimeRange(v, DEFAULT_TIME_RANGE)}
        >
          {DURATIONS.map((item) => (
            <Select.Option value={item.value} key={item.label}>
              {item.label}
            </Select.Option>
          ))}
        </Select>
      </div>

      <div>
        <span>Time Range: </span>
        <Select
          style={{ width: 240 }}
          value={tw[0] === 0 ? '' : `${tw[0]}-${tw[1]}`}
          onChange={setTw}
        >
          {(availableTimeWindows ?? []).map((item) => {
            const bd = dayjs.unix(item.begin_time)
            const ed = dayjs.unix(item.end_time)
            let ts = ''
            if (bd.date() === ed.date()) {
              ts = `${bd.format('MM-DD HH:mm')}~${ed.format('HH:mm')}`
            } else {
              ts = `${bd.format('MM-DD HH:mm')}~${ed.format('MM-DD HH:mm')}`
            }

            return (
              <Select.Option
                value={`${item.begin_time}-${item.end_time}`}
                key={`${item.begin_time}-${item.end_time}`}
              >
                {ts}
              </Select.Option>
            )
          })}
        </Select>
        <span>
          {' '}
          <Button icon={<CaretLeftOutlined />} onClick={olderTw} />{' '}
          <Button icon={<CaretRightOutlined />} onClick={newerTw} />
        </span>
      </div>
      <span style={{ marginLeft: 'auto' }}>Time Zone: {timezone}</span>
    </div>
  )
}

function useChartData() {
  const ctx = useTopSlowQueryContext()
  const { tw } = useTopSlowQueryUrlState()

  const query = useQuery({
    queryKey: [
      'top_slowquery_chart_data',
      ctx.cfg.orgName,
      ctx.cfg.clusterName,
      tw
    ],
    queryFn: () => {
      return ctx.api.getMetrics({
        start: tw[0],
        end: tw[1]
      })
    }
  })
  return query
}

function SlowQueryCountChart() {
  const { data: chartData, isLoading } = useChartData()
  const { tw, setDurationAndTimeRange } = useTopSlowQueryUrlState()

  function onSelectTimeRange(timeRange: TimeRangeValue) {
    const delta = timeRange[1] - timeRange[0]
    let duration = 60 * 60
    if (delta < 60 * 60) {
      duration = 60 * 60
    } else if (delta < 3 * 60 * 60) {
      duration = 3 * 60 * 60
    } else if (delta < 6 * 60 * 60) {
      duration = 6 * 60 * 60
    } else if (delta < 12 * 60 * 60) {
      duration = 12 * 60 * 60
    } else if (delta < 24 * 60 * 60) {
      duration = 24 * 60 * 60
    } else if (delta < 7 * 24 * 60 * 60) {
      duration = 7 * 24 * 60 * 60
    }
    setDurationAndTimeRange(duration, fromTimeRangeValue(timeRange))
  }

  return (
    <div style={{ marginTop: 16, marginBottom: 24 }}>
      <Typography.Title level={5}>Slow Query Count</Typography.Title>
      <div style={{ height: 200 }}>
        <Skeleton paragraph={{ rows: 4 }} active loading={isLoading}>
          <CountChart
            data={chartData ?? []}
            timeRange={tw as TimeRangeValue}
            onSelectTimeRange={onSelectTimeRange}
          />
        </Skeleton>
      </div>
    </div>
  )
}

function useDatabaseList() {
  const ctx = useTopSlowQueryContext()
  const { tw } = useTopSlowQueryUrlState()

  const query = useQuery({
    queryKey: [
      'top_slowquery_database_list',
      ctx.cfg.orgName,
      ctx.cfg.clusterName,
      tw
    ],
    queryFn: () => {
      return ctx.api.getDatabaseList({ start: tw[0], end: tw[1] })
    }
  })
  return query
}

function TopSlowQueryFilters() {
  const { db, setDb, internal, setInternal, order, setOrder } =
    useTopSlowQueryUrlState()
  const { data: databaseList } = useDatabaseList()

  const dataBaseListOptions = useMemo(() => {
    const opts = (databaseList ?? []).map((item) => ({
      label: item,
      value: item
    }))
    return [{ label: 'All', value: '' }, ...opts]
  }, [databaseList])

  return (
    <Space style={{ marginBottom: 8 }}>
      <div>
        <span>Database: </span>
        <Select
          style={{ minWidth: 160 }}
          value={db || ''}
          onChange={setDb}
          showSearch
        >
          {dataBaseListOptions.map((item) => (
            <Select.Option value={item.value} key={item.value}>
              {item.label}
            </Select.Option>
          ))}
        </Select>
      </div>

      <div>
        <span>Internal: </span>
        <Select style={{ width: 80 }} value={internal} onChange={setInternal}>
          <Select.Option value="no">No</Select.Option>
          <Select.Option value="yes">Yes</Select.Option>
        </Select>
      </div>

      <div>
        <span>Order by: </span>
        <Select style={{ width: 180 }} value={order} onChange={setOrder}>
          {ORDER_BY.map((item) => (
            <Select.Option value={item.value} key={item.value}>
              {item.label}
            </Select.Option>
          ))}
        </Select>
      </div>
    </Space>
  )
}
