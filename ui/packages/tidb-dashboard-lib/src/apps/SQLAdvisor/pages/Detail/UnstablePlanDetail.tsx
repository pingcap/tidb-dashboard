import React, { useEffect, useState, useMemo } from 'react'
import {
  Head,
  Descriptions,
  Expand,
  HighlightSQL,
  CopyLink
} from '@lib/components'
import { Link } from 'react-router-dom'
import { ArrowLeftOutlined, LoadingOutlined } from '@ant-design/icons'
import { Space, Collapse, Tooltip, Table } from 'antd'
import styles from './index.module.less'
import { UnstablePlanDetailData } from './UnstablePlanDetailData'

console.log('UnstablePlanDetailData', UnstablePlanDetailData)
const { Panel } = Collapse

const UnstablePlanDetail = () => {
  const [unstablePlanDetail, setUnstablePlanDetail] = useState<any | null>(
    UnstablePlanDetailData
  )
  const [loading, setLoading] = useState(false)
  const [sqlExpanded, setSqlExpanded] = useState(false)
  const toggleSqlExpanded = () => setSqlExpanded((prev) => !prev)

  useEffect(() => {
    setUnstablePlanDetail(UnstablePlanDetailData)
  }, [])

  const plans = unstablePlanDetail.plans

  const plansColumns = useMemo(
    () => [
      {
        title: 'Plan ID',
        dataIndex: 'plan_id',
        key: 'plan_id',
        ellipsis: true,
        render: (_, row) => {
          return (
            <Tooltip title={row.plan_id} placement="topLeft">
              {row.plan_id}
            </Tooltip>
          )
        }
      },
      {
        title: 'Mean Latency',
        dataIndex: 'avg_latency',
        key: 'avg_latency',
        ellipsis: true,
        render: (_, row) => {
          return <>{row.avg_latency}</>
        }
      },
      {
        title: 'Execution Count',
        dataIndex: 'exec_count',
        key: 'exec_count',
        ellipsis: true,
        render: (_, row) => {
          return <>{row.exec_count}</>
        }
      },
      {
        title: 'Mean Memory',
        dataIndex: 'avg_mem_byte',
        key: 'avg_mem_byte',
        width: 100,
        ellipsis: true,
        render: (_, row) => {
          return <>{row.avg_mem_byte}</>
        }
      }
    ],
    []
  )
  return (
    <div>
      <Head
        title={'Unstable Plan Detail'}
        back={
          <Link to="/sql_advisor">
            <ArrowLeftOutlined />
          </Link>
        }
      />
      <div style={{ margin: 48 }}>
        <div style={{ textAlign: 'center' }}>
          {loading && <LoadingOutlined />}
        </div>
        {unstablePlanDetail && (
          <Space direction="vertical" style={{ display: 'flex' }}>
            <Collapse defaultActiveKey={['1']} expandIconPosition="end">
              <Panel header="Basic Information" key="1">
                <Descriptions>
                  <Descriptions.Item
                    span={2}
                    label={
                      <Space size="middle">
                        <span>SQL Statement</span>
                        <Expand.Link
                          expanded={sqlExpanded}
                          onClick={toggleSqlExpanded}
                        />
                      </Space>
                    }
                  >
                    <Expand
                      expanded={sqlExpanded}
                      collapsedContent={
                        <HighlightSQL
                          sql={unstablePlanDetail.statement.digest_text}
                          compact
                        />
                      }
                    >
                      <HighlightSQL
                        sql={unstablePlanDetail.statement.digest_text}
                      />
                    </Expand>
                  </Descriptions.Item>
                  <Descriptions.Item
                    span={2}
                    label={
                      <Space>
                        <span>SQL Digest</span>
                        <CopyLink data={unstablePlanDetail.statement.digest} />
                      </Space>
                    }
                  >
                    {unstablePlanDetail.statement.digest}
                  </Descriptions.Item>
                </Descriptions>
                {plans && (
                  <>
                    <p>
                      The query has multiple execution plans, which the
                      execution plan has the lowest average latency among all.
                    </p>
                    <ul>
                      <li>
                        {
                          unstablePlanDetail.statement.suggest_plan_overview
                            .plan_digest
                        }
                      </li>
                    </ul>
                    <p>
                      We can bind this SQL statement to this specific execution
                      plan, which is expected to have a{' '}
                      <span
                        className={`${
                          unstablePlanDetail.statement.impact.toUpperCase() ===
                          'HIGH'
                            ? styles.HighImpact
                            : unstablePlanDetail.statement.impact.toUpperCase() ===
                              'MEDIUM'
                            ? styles.MiddleImpact
                            : styles.LowImpact
                        }`}
                      >
                        {unstablePlanDetail.statement.impact.toUpperCase()}{' '}
                      </span>
                      impact on query performance.
                    </p>
                  </>
                )}
                <p>
                  You can execute this command to create the corresponding plan
                  binding:{' '}
                </p>
                <div className={styles.SuggestedCommand}>
                  <div>
                    {
                      unstablePlanDetail.statement.suggest_plan_overview
                        .create_binding_statement
                    }
                  </div>
                  <CopyLink
                    data={
                      unstablePlanDetail.statement.suggest_plan_overview
                        .create_binding_statement
                    }
                  />
                </div>
              </Panel>
            </Collapse>
            <Collapse>
              <Panel header="Existing Plans" key="1">
                <Table
                  columns={plansColumns}
                  dataSource={plans}
                  size="small"
                  pagination={false}
                />
              </Panel>
            </Collapse>
          </Space>
        )}
      </div>
    </div>
  )
}

export default UnstablePlanDetail
