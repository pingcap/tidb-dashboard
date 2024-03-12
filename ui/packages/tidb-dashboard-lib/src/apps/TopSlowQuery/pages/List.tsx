import React, { useRef, useMemo } from 'react'
import { Space, Select, Typography } from 'antd'
import { CaretLeftOutlined, CaretRightOutlined } from '@ant-design/icons'
import { Card, TimeRangeSelector, toTimeRangeValue } from '@lib/components'

import styles from './List.module.less'
import { useTopSlowQueryContext } from '../context'
import { Link } from 'react-router-dom'
import { useTopSlowQueryUrlState } from '../uilts/url-state'
import {
  TIME_RANGE_RECENT_SECONDS,
  TIME_WINDOW_SIZES,
  TOP_N_TYPES
} from '../uilts/helpers'
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
      <span style={{ fontSize: 18, fontWeight: 600 }}>
        <Link to="/slow_query">Slow Query Logs</Link>
        <span> | </span>
        <span>Top SlowQueries</span>
      </span>
    </div>
  )
}

function useTimeWindows() {
  const ctx = useTopSlowQueryContext()
  const { timeRange, tws, tw, setTw } = useTopSlowQueryUrlState()

  const query = useQuery({
    queryKey: [
      'top_slowquery_time_windows',
      timeRange,
      tws,
      ctx.cfg.orgName,
      ctx.cfg.clusterName
    ],
    queryFn: () => {
      const timeVal = toTimeRangeValue(timeRange)
      return ctx.api.getAvailableTimeWindows({
        from: timeVal[0],
        to: timeVal[1],
        tws
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

function TimeWindowSelect() {
  const { timeRange, setTimeRange, tws, setTws, tw, setTw } =
    useTopSlowQueryUrlState()
  const { data: availableTimeWindows } = useTimeWindows()

  function preTw() {
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

  function nextTw() {
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
    <Space>
      <div>
        <span>Time Range: </span>
        <TimeRangeSelector
          value={timeRange}
          onChange={setTimeRange}
          recent_seconds={TIME_RANGE_RECENT_SECONDS}
        />
      </div>

      <div>
        <span>Time Window Size: </span>
        <Select style={{ width: 128 }} value={tws} onChange={setTws}>
          {TIME_WINDOW_SIZES.map((item) => (
            <Select.Option value={item.value} key={item.label}>
              {item.label}
            </Select.Option>
          ))}
        </Select>
      </div>

      <div>
        <span>Time Window: </span>
        <Select
          style={{ width: 448 }}
          value={tw[0] === 0 ? '' : `${tw[0]}-${tw[1]}`}
          onChange={setTw}
        >
          {(availableTimeWindows ?? []).map((item) => (
            <Select.Option
              value={`${item.begin_time}-${item.end_time}`}
              key={`${item.begin_time}-${item.end_time}`}
            >
              {`${dayjs
                .unix(item.begin_time)
                .format('MM-DD HH:mm:ss (UTCZ)')} - ${dayjs
                .unix(item.end_time)
                .format('MM-DD HH:mm:ss (UTCZ)')}`}
            </Select.Option>
          ))}
        </Select>
        <span>
          <CaretLeftOutlined onClick={preTw} />
          <CaretRightOutlined onClick={nextTw} />
        </span>
      </div>
    </Space>
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
  const { data: chartData } = useChartData()

  return (
    <div style={{ marginTop: 16, marginBottom: 24 }}>
      <Typography.Title level={5}>Slow Query Count</Typography.Title>
      <div style={{ height: 200 }}>
        <CountChart data={chartData ?? []} />
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
  const { topType, setTopType, db, setDb, internal, setInternal } =
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
        <span>Top 10: </span>
        <Select style={{ width: 180 }} value={topType} onChange={setTopType}>
          {TOP_N_TYPES.map((item) => (
            <Select.Option value={item.value} key={item.value}>
              {item.label}
            </Select.Option>
          ))}
        </Select>
      </div>

      <div>
        <span>Database: </span>
        <Select style={{ minWidth: 160 }} value={db || ''} onChange={setDb}>
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
    </Space>
  )
}
