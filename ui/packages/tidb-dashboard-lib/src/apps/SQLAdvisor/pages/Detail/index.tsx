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
import { SuggestedCommandMaps } from '../../utils/suggestedCommandMaps'
import { TuningDetailProps } from '../../types'
import { SQLAdvisorContext } from '../../context'
import dayjs from 'dayjs'
import tz from '@lib/utils/timezone'

const { Panel } = Collapse

const PanelMaps: Record<string, string> = {
  basic: 'Basic Information',
  // why_give_this_sugguestion: 'Why give this suggestion',
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
        width: 350,
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
        width: 250,
        render: (_, row) => {
          return <>{row.index_name}</>
        }
      },
      {
        title: 'Column',
        dataIndex: 'columns',
        key: 'columns',
        width: 350,
        render: (_, row) => {
          return <>{row.columns}</>
        }
      },
      {
        title: 'Clustered',
        dataIndex: 'clusterd',
        key: 'clusterd',
        width: 100,
        render: (_, row) => {
          return <>{row.clusterd ? 'Yes' : 'No'}</>
        }
      },
      {
        title: 'Visible',
        dataIndex: 'visible',
        key: 'visible',
        width: 100,
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
        width: 350,
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
        width: 150,
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
        width: 150,
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
      SuggestedCommandMaps[command.suggestion_key](command.params)
    )

  useEffect(() => {
    const sqlTunedDetailGet = async () => {
      await ctx?.ds
        .tuningDetailGet(id)
        .then((data) => {
          setSqlTunedDetail(data)
        })
        .finally(() => setLoading(false))
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
                  <Descriptions.Item label="Insight Type" span={2}>
                    {sqlTunedDetail.insight_type}
                  </Descriptions.Item>
                  <Descriptions.Item label="Impact" span={2}>
                    {sqlTunedDetail.impact}
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
                  {suggestedCommands && suggestedCommandsCopyData && (
                    <Descriptions.Item
                      span={2}
                      label={
                        <Space>
                          <span>Suggested Command</span>
                          <CopyLink
                            data={suggestedCommandsCopyData.join('\n')}
                          />
                        </Space>
                      }
                    >
                      <div style={{ display: 'block', width: '100%' }}>
                        {suggestedCommands.map((command) => (
                          <div
                            style={{
                              background: '#f1f1f1',
                              padding: '3px 10px'
                            }}
                          >
                            {SuggestedCommandMaps[command!.suggestion_key](
                              command!.params
                            )}
                          </div>
                        ))}
                      </div>
                    </Descriptions.Item>
                  )}
                </Descriptions>
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
