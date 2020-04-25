import React, { useState, useEffect } from 'react'
import { Root, DateTime, MetricChart } from '@lib/components'
import { Row, Col } from 'antd'
import { RightOutlined } from '@ant-design/icons'
import { HashRouter as Router, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import client, {
  ClusterinfoClusterInfo,
  StatementTimeRange,
  StatementModel,
  SlowqueryBase,
} from '@lib/client'
import { StatementsTable } from '@lib/apps/Statement'
import MonitorAlertBar from './components/MonitorAlertBar'
import Nodes from './components/Nodes'
import { getDefSearchOptions } from '../SlowQuery/components/List'
import SlowQueriesTable from '../SlowQuery/components/SlowQueriesTable'

import styles from './index.module.less'

function useStatements() {
  const [timeRange, setTimeRange] = useState<StatementTimeRange>({
    begin_time: 0,
    end_time: 0,
  })
  const [statements, setStatements] = useState<StatementModel[]>([])
  const [loadingStatements, setLoadingStatements] = useState(true)

  useEffect(() => {
    const fetchStatements = async () => {
      setLoadingStatements(true)
      const rRes = await client.getInstance().statementsTimeRangesGet()
      const timeRanges = rRes.data || []
      if (timeRanges.length > 0) {
        setTimeRange(timeRanges[0])
        const res = await client
          .getInstance()
          .statementsOverviewsGet(
            timeRanges[0].begin_time!,
            timeRanges[0].end_time!
          )
        setStatements(res.data || [])
      }
      setLoadingStatements(false)
    }
    fetchStatements()
  }, [])

  return { timeRange, statements, loadingStatements }
}

function useSlowQueries() {
  const [searchOptions, setSearchOptions] = useState(getDefSearchOptions)
  const [slowQueries, setSlowQueries] = useState<SlowqueryBase[]>([])
  const [loadingSlowQueries, setLoadingSlowQueries] = useState(true)

  function changeSort(orderBy: string, desc: boolean) {
    setSearchOptions({
      ...searchOptions,
      orderBy,
      desc,
    })
  }

  useEffect(() => {
    async function getSlowQueryList() {
      setLoadingSlowQueries(true)
      const res = await client
        .getInstance()
        .slowQueryListGet(
          searchOptions.schemas,
          searchOptions.desc,
          10,
          searchOptions.timeRange.end_time,
          searchOptions.timeRange.begin_time,
          searchOptions.orderBy,
          searchOptions.searchText
        )
      setLoadingSlowQueries(false)
      setSlowQueries(res.data || [])
    }
    getSlowQueryList()
  }, [searchOptions])

  return {
    slowQueries,
    loadingSlowQueries,
    changeSort,
    searchOptions,
  }
}

export default function App() {
  const { t } = useTranslation()
  const [cluster, setCluster] = useState<ClusterinfoClusterInfo | null>(null)
  const { timeRange, statements, loadingStatements } = useStatements()
  const {
    slowQueries,
    loadingSlowQueries,
    changeSort,
    searchOptions,
  } = useSlowQueries()

  useEffect(() => {
    const fetchLoad = async () => {
      try {
        let res = await client.getInstance().topologyAllGet()
        setCluster(res.data)
      } catch (error) {
        setCluster(null)
      }
    }

    fetchLoad()
  }, [])

  return (
    <Root>
      <Router>
        <Row gutter={24}>
          <Col span={18}>
            <MetricChart
              title={t('overview.metrics.total_requests')}
              series={[
                {
                  query: 'sum(rate(tidb_server_query_total[1m])) by (result)',
                  name: 'Queries {result}',
                },
              ]}
              unit="ops"
              type="bar"
            />
            <MetricChart
              title={t('overview.metrics.latency')}
              series={[
                {
                  query:
                    'histogram_quantile(0.999, sum(rate(tidb_server_handle_query_duration_seconds_bucket[1m])) by (le))',
                  name: '99.9%',
                },
                {
                  query:
                    'histogram_quantile(0.99, sum(rate(tidb_server_handle_query_duration_seconds_bucket[1m])) by (le))',
                  name: '99%',
                },
                {
                  query:
                    'histogram_quantile(0.9, sum(rate(tidb_server_handle_query_duration_seconds_bucket[1m])) by (le))',
                  name: '90%',
                },
              ]}
              unit="s"
              type="line"
            />
            <StatementsTable
              className={styles.statementsTable}
              key={`statement_${statements.length}`}
              statements={statements}
              visibleColumnKeys={{
                digest_text: true,
                sum_latency: true,
                avg_latency: true,
                related_schemas: true,
              }}
              visibleItemsCount={5}
              loading={loadingStatements}
              timeRange={timeRange}
              title={
                <Link to="/statement">
                  {t('overview.top_statements.title')} <RightOutlined />
                </Link>
              }
              subTitle={
                timeRange.begin_time && (
                  <span>
                    <DateTime.Calendar
                      unixTimestampMs={timeRange.begin_time * 1000}
                    />{' '}
                    ~{' '}
                    <DateTime.Calendar
                      unixTimestampMs={(timeRange.end_time ?? 0) * 1000}
                    />
                  </span>
                )
              }
            />
            <SlowQueriesTable
              key={`slow_query_${slowQueries.length}`}
              loading={loadingSlowQueries}
              slowQueries={slowQueries}
              visibleColumnKeys={{
                sql: true,
                Time: true,
                Query_time: true,
                Mem_max: true,
              }}
              onChangeSort={changeSort}
              orderBy={searchOptions.orderBy}
              desc={searchOptions.desc}
              title={
                <Link to="/slow_query">
                  Recent Slow Queries <RightOutlined />
                </Link>
              }
              subTitle={
                <span>
                  <DateTime.Calendar
                    unixTimestampMs={searchOptions.timeRange.begin_time * 1000}
                  />{' '}
                  ~{' '}
                  <DateTime.Calendar
                    unixTimestampMs={
                      (searchOptions.timeRange.end_time ?? 0) * 1000
                    }
                  />
                </span>
              }
            />
          </Col>
          <Col span={6}>
            <Nodes />
            <MonitorAlertBar cluster={cluster} />
          </Col>
        </Row>
      </Router>
    </Root>
  )
}
