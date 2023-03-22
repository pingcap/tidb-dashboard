import React, { useState, useMemo, useEffect, useContext } from 'react'

import {
  Head,
  Descriptions,
  Expand,
  HighlightSQL,
  CopyLink
} from '@lib/components'
import { Link } from 'react-router-dom'
import { ArrowLeftOutlined } from '@ant-design/icons'
import useQueryParams from '@lib/utils/useQueryParams'
import { Space, Collapse, Tooltip, Table } from 'antd'

import { LoadingOutlined } from '@ant-design/icons'
import { getSuggestedCommand } from '../../utils/suggestedCommandMaps'
import { TuningDetailProps } from '../../types'
import { SQLAdvisorContext } from '../../context'
import dayjs from 'dayjs'
import tz from '@lib/utils/timezone'
import styles from './index.module.less'

const { Panel } = Collapse

const PanelMaps: Record<string, string> = {
  basic: 'Basic Information',
  table_clause: 'Existing Indexes',
  table_healthies: 'Table Healthies'
}

export default function SQLAdvisorDetail() {
  const ctx = useContext(SQLAdvisorContext)
  const { id } = useQueryParams()
  const [sqlTunedDetail, setSqlTunedDetail] =
    useState<TuningDetailProps | null>(null)
  const [sqlExpanded, setSqlExpanded] = useState(false)
  const [loading, setLoading] = useState(true)
  const toggleSqlExpanded = () => setSqlExpanded((prev) => !prev)

  const tableClausesColumns = useMemo(
    () => [
      {
        title: 'Table',
        dataIndex: 'table_name',
        key: 'table_name',
        ellipsis: true,
        render: (_, row) => {
          return (
            <Tooltip title={row.table_name} placement="topLeft">
              {row.table_name}
            </Tooltip>
          )
        }
      },
      {
        title: 'Index Name',
        dataIndex: 'index_name',
        key: 'index_name',
        ellipsis: true,
        render: (_, row) => {
          return <>{row.index_name}</>
        }
      },
      {
        title: 'Column',
        dataIndex: 'columns',
        key: 'columns',
        ellipsis: true,
        render: (_, row) => {
          return <>{row.columns}</>
        }
      },
      {
        title: 'Clustered',
        dataIndex: 'clusterd',
        key: 'clusterd',
        width: 100,
        ellipsis: true,
        render: (_, row) => {
          return <>{row.clusterd ? 'Yes' : 'No'}</>
        }
      },
      {
        title: 'Visible',
        dataIndex: 'visible',
        key: 'visible',
        ellipsis: true,
        render: (_, row) => {
          return <>{row.visible ? 'Yes' : 'No'}</>
        }
      }
    ],
    []
  )

  const tableHealthiesColumns = useMemo(
    () => [
      {
        title: 'Table',
        dataIndex: 'table_name',
        key: 'table_name',
        ellipsis: true,
        render: (_, row) => {
          return (
            <Tooltip title={row.table_name} placement="topLeft">
              {row.table_name}
            </Tooltip>
          )
        }
      },
      {
        title: 'Healthy',
        dataIndex: 'healthy',
        key: 'healthy',
        ellipsis: true,
        render: (_, row) => {
          return <>{row.healthy}</>
        }
      },
      {
        title: `Analyzed Time (UTC${
          tz.getTimeZone() < 0 ? '-' : '+'
        }${tz.getTimeZone()})`,
        dataIndex: 'checked_time',
        key: 'checked_time',
        ellipsis: true,
        render: () => {
          return (
            <>
              {dayjs(sqlTunedDetail?.checked_time)
                .utcOffset(tz.getTimeZone())
                .format('YYYY-MM-DD HH:mm:ss')}
            </>
          )
        }
      }
    ],
    [sqlTunedDetail]
  )

  const existingIndexes = sqlTunedDetail?.table_clauses?.map(
    (item) => item.index_list
  )

  const suggestedCommands = sqlTunedDetail?.suggested_command
  const suggestedCommandsCopyData =
    suggestedCommands &&
    suggestedCommands.map((command) =>
      getSuggestedCommand(command.suggestion_key, command.params)
    )

  const suggestedCMDExplanation =
    suggestedCommands &&
    suggestedCommands
      .map((cmd) => {
        const fields = cmd.cmd_explanation.fields
        const table_name = cmd.cmd_explanation.table_name
        const explanation = {
          fields: fields,
          table_name: table_name
        }
        return fields && table_name ? explanation : null
      })
      .filter((cmd) => cmd)

  useEffect(() => {
    const sqlTunedDetailGet = async () => {
      try {
        const res = await ctx?.ds.tuningDetailGet(id)
        setSqlTunedDetail(res!)
      } finally {
        setLoading(false)
      }
    }

    sqlTunedDetailGet()
  }, [ctx, id])

  return (
    <div>
      <Head
        title={
          sqlTunedDetail
            ? `Performance Insight Detail - ${sqlTunedDetail.insight_type}`
            : 'Performance Insight Detail'
        }
        back={
          <Link to="/sql_advisor">
            <ArrowLeftOutlined />
          </Link>
        }
      ></Head>
      <div style={{ margin: 48 }}>
        <div style={{ textAlign: 'center' }}>
          {loading && <LoadingOutlined />}
        </div>
        {sqlTunedDetail && (
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
                          sql={sqlTunedDetail.sql_statement}
                          compact
                        />
                      }
                    >
                      <HighlightSQL sql={sqlTunedDetail.sql_statement} />
                    </Expand>
                  </Descriptions.Item>
                  <Descriptions.Item
                    span={2}
                    label={
                      <Space>
                        <span>SQL Digest</span>
                        <CopyLink data={sqlTunedDetail.sql_digest} />
                      </Space>
                    }
                  >
                    {sqlTunedDetail.sql_digest}
                  </Descriptions.Item>
                  <Descriptions.Item
                    span={2}
                    label={
                      <Space>
                        <span>Plan Digest</span>
                        <CopyLink data={sqlTunedDetail.plan_digest} />
                      </Space>
                    }
                  >
                    {sqlTunedDetail.plan_digest}
                  </Descriptions.Item>
                </Descriptions>
                {suggestedCMDExplanation && suggestedCMDExplanation.length > 0 && (
                  <>
                    <p>The query is {sqlTunedDetail.insight_type} on</p>
                    <ul>
                      {suggestedCMDExplanation.map((cmdExp) => (
                        <li>
                          fields{' '}
                          <span className={styles.InlineCodeBlock}>
                            {cmdExp?.fields.join(', ')}
                          </span>{' '}
                          in the{' '}
                          <span className={styles.InlineCodeBlock}>
                            {cmdExp!.table_name}
                          </span>{' '}
                          table
                        </li>
                      ))}
                    </ul>
                    <p>
                      which is expected to have a{' '}
                      <span
                        className={`${
                          sqlTunedDetail.impact.toUpperCase() === 'HIGH'
                            ? styles.HighImpact
                            : sqlTunedDetail.impact.toUpperCase() === 'MEDIUM'
                            ? styles.MiddleImpact
                            : styles.LowImpact
                        }`}
                      >
                        {sqlTunedDetail.impact.toUpperCase()}{' '}
                      </span>
                      on query performance.
                    </p>
                  </>
                )}
                <p>
                  You can execute this command on create the corresponding
                  index:{' '}
                </p>
                {suggestedCommands && suggestedCommandsCopyData && (
                  <div className={styles.SuggestedCommand}>
                    <div>
                      {suggestedCommands.map((command) => (
                        <div>
                          {getSuggestedCommand(
                            command!.suggestion_key,
                            command!.params
                          )}
                        </div>
                      ))}
                    </div>
                    <CopyLink data={suggestedCommandsCopyData.join('\n')} />
                  </div>
                )}
              </Panel>
            </Collapse>
            {sqlTunedDetail.table_clauses &&
              existingIndexes &&
              existingIndexes.flat().length > 0 && (
                <Collapse
                  defaultActiveKey={[PanelMaps.table_clause]}
                  expandIconPosition="end"
                >
                  <Panel
                    header={PanelMaps.table_clause}
                    key={PanelMaps.table_clause}
                  >
                    <Table
                      columns={tableClausesColumns}
                      dataSource={existingIndexes.flat()}
                      size="small"
                      pagination={false}
                    />
                  </Panel>
                </Collapse>
              )}
            {sqlTunedDetail.table_healthies &&
              sqlTunedDetail.table_healthies.length > 0 && (
                <Collapse
                  defaultActiveKey={[PanelMaps.table_healthies]}
                  expandIconPosition="end"
                >
                  <Panel
                    header={PanelMaps.table_healthies}
                    key={PanelMaps.table_healthies}
                  >
                    <Table
                      columns={tableHealthiesColumns}
                      dataSource={sqlTunedDetail.table_healthies}
                      size="small"
                      pagination={false}
                    />
                  </Panel>
                </Collapse>
              )}
          </Space>
        )}
      </div>
    </div>
  )
}
