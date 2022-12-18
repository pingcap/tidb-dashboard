import React, { useState, useMemo } from 'react'

import {
  Head,
  Descriptions,
  Expand,
  HighlightSQL,
  CopyLink,
  CardTable
} from '@lib/components'
import { Link } from 'react-router-dom'
import {
  ArrowLeftOutlined,
  TableOutlined,
  FilterOutlined
} from '@ant-design/icons'
import { sqlTunedResultByIDResp } from '../../component/mock_data'
import { IColumn } from 'office-ui-fabric-react/lib/DetailsList'
import { Space, Collapse, Typography, Button, List, Tag } from 'antd'
const { Panel } = Collapse

const PanelMaps: Record<string, string> = {
  basic: 'Basic Information',
  why_give_this_sugguestion: 'Why give this suggestion',
  table_clause: 'Existing Indexes',
  table_healthies: 'Table Healthies'
}

export default function SQLAdvisorDetail() {
  const sqlTunedResultByID = sqlTunedResultByIDResp.data.sql_tuned_result

  const [sqlExpanded, setSqlExpanded] = useState(false)
  const toggleSqlExpanded = () => setSqlExpanded((prev) => !prev)

  const tableClausesColumns: IColumn[] = useMemo(
    () => [
      {
        name: 'Table',
        key: 'table_name',
        minWidth: 100,
        maxWidth: 150,
        onRender: (row) => {
          return <>{row.table_name}</>
        }
      },
      {
        name: 'Table',
        key: 'index_name',
        minWidth: 100,
        maxWidth: 150,
        onRender: (row) => {
          return <>{row.index_name}</>
        }
      },
      {
        name: 'Columns',
        key: 'columns',
        minWidth: 100,
        maxWidth: 350,
        onRender: (row) => {
          return <>{row.columns}</>
        }
      },
      {
        name: 'Clustered',
        key: 'clusterd',
        minWidth: 100,
        maxWidth: 150,
        onRender: (row) => {
          return <>{row.clusterd ? 'Yes' : 'No'}</>
        }
      },
      {
        name: 'Visible',
        key: 'visible',
        minWidth: 100,
        maxWidth: 150,
        onRender: (row) => {
          return <>{row.visible ? 'Yes' : 'No'}</>
        }
      }
    ],
    []
  )

  const tableHealthiesColumns: IColumn[] = useMemo(
    () => [
      {
        name: 'Table',
        key: 'table_name',
        minWidth: 100,
        maxWidth: 150,
        onRender: (row) => {
          return <>{row.table_name}</>
        }
      },
      {
        name: 'Healthy',
        key: 'healthy',
        minWidth: 100,
        maxWidth: 150,
        onRender: (row) => {
          return <>{row.healthy}</>
        }
      },
      {
        name: 'Analyzed Time',
        key: 'analyzed_time',
        minWidth: 100,
        maxWidth: 150,
        onRender: (row) => {
          return <>{row.analyzed_time}</>
        }
      }
    ],
    []
  )

  const tableClauses = sqlTunedResultByID.table_clauses.map((item) => ({
    table_name: item.table_name,
    clauses: item.where_clause.map((c) => `${item.table_name}.${c}`) || []
  }))

  const existingIndexes = sqlTunedResultByID.table_clauses.map((item) => {
    return item.index_list
  })

  console.log('existingIndexes', existingIndexes.flat())
  return (
    <div>
      <Head
        title="Index Insight Detail"
        back={
          <Link to="/sql_advisor">
            <ArrowLeftOutlined />
          </Link>
        }
        titleExtra={
          <Space>
            <Button>Statement</Button>
            <Button>Slow Query</Button>
          </Space>
        }
      ></Head>
      <div style={{ margin: 48 }}>
        <Space direction="vertical" style={{ display: 'flex' }}>
          <Collapse defaultActiveKey={['1']} expandIconPosition="end">
            <Panel header="Basic Information" key="1">
              <Descriptions>
                <Descriptions.Item label="Insight Type">
                  {sqlTunedResultByID.insight_type}
                </Descriptions.Item>
                <Descriptions.Item label="Impact">
                  {sqlTunedResultByID.impact}
                </Descriptions.Item>
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
                        sql={sqlTunedResultByID.sql_statement}
                        compact
                      />
                    }
                  >
                    <HighlightSQL sql={sqlTunedResultByID.sql_statement} />
                  </Expand>
                </Descriptions.Item>
                <Descriptions.Item
                  span={2}
                  label={
                    <Space>
                      <span>SQL Digest</span>
                      <CopyLink data={sqlTunedResultByID.sql_digest} />
                    </Space>
                  }
                >
                  {sqlTunedResultByID.sql_digest}
                </Descriptions.Item>
                <Descriptions.Item
                  span={2}
                  label={
                    <Space>
                      <span>Suggested Command</span>
                      <CopyLink data={sqlTunedResultByID.suggested_command} />
                    </Space>
                  }
                >
                  <pre>
                    <code>{sqlTunedResultByID.suggested_command}</code>
                  </pre>
                </Descriptions.Item>
              </Descriptions>
            </Panel>
          </Collapse>
          {sqlTunedResultByID.table_clauses.length > 0 && (
            <Collapse
              defaultActiveKey={[PanelMaps.why_give_this_sugguestion]}
              expandIconPosition="end"
            >
              <Panel
                header={PanelMaps.why_give_this_sugguestion}
                key={PanelMaps.why_give_this_sugguestion}
              >
                <List
                  header={<>1. Confirm the scope of the tables</>}
                  split={false}
                  itemLayout="vertical"
                  dataSource={tableClauses}
                  renderItem={(item) => (
                    <List.Item>
                      <Tag icon={<TableOutlined />}>{item.table_name}</Tag>
                    </List.Item>
                  )}
                />
                <List
                  header={<>2. Detect some clauses</>}
                  split={false}
                  itemLayout="vertical"
                  dataSource={tableClauses}
                  renderItem={(item) => (
                    <>
                      {item.clauses.map((clause) => (
                        <List.Item>
                          <Tag icon={<FilterOutlined />}>{clause}</Tag>
                        </List.Item>
                      ))}
                    </>
                  )}
                />
              </Panel>
            </Collapse>
          )}
          {sqlTunedResultByID.table_clauses && (
            <Collapse
              defaultActiveKey={[PanelMaps.table_clause]}
              expandIconPosition="end"
            >
              <Panel
                header={PanelMaps.table_clause}
                key={PanelMaps.table_clause}
              >
                <CardTable
                  columns={tableClausesColumns}
                  items={existingIndexes.flat()}
                  cardNoMargin
                  loading={false}
                  style={{ marginLeft: 48, marginRight: 48 }}
                ></CardTable>
              </Panel>
            </Collapse>
          )}
          {sqlTunedResultByID.table_healthies && (
            <Collapse
              defaultActiveKey={[PanelMaps.table_healthies]}
              expandIconPosition="end"
            >
              <Panel
                header={PanelMaps.table_healthies}
                key={PanelMaps.table_healthies}
              >
                <CardTable
                  columns={tableHealthiesColumns}
                  items={sqlTunedResultByID.table_healthies}
                  cardNoMargin
                  loading={false}
                  style={{ marginLeft: 48, marginRight: 48 }}
                ></CardTable>
              </Panel>
            </Collapse>
          )}
        </Space>
      </div>
    </div>
  )
}
