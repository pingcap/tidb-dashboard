import { Badge, Button, Modal, Progress, Space, Tooltip } from 'antd'
import React, { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useMemoizedFn } from 'ahooks'
import { Link } from 'react-router-dom'
import { ArrowLeftOutlined, QuestionCircleOutlined } from '@ant-design/icons'
import { upperFirst } from 'lodash'

import client, { ProfilingTaskModel } from '@lib/client'
import { CardTable, DateTime, Head, Descriptions, Card } from '@lib/components'
import { useClientRequestWithPolling } from '@lib/utils/useClientRequest'
import publicPathPrefix from '@lib/utils/publicPathPrefix'
import { InstanceKindName } from '@lib/utils/instanceTable'
import useQueryParams from '@lib/utils/useQueryParams'
import { IGroup } from 'office-ui-fabric-react/lib/DetailsList'
import { ScrollablePane } from 'office-ui-fabric-react/lib/ScrollablePane'

enum ViewOptions {
  FlameGraph = 'flamegraph',
  Graph = 'graph',
  Download = 'download',
  Text = 'text',
}

enum taskState {
  Error,
  Running,
  Success,
  Skipped = 4,
}

enum RawDataType {
  Protobuf = 'protobuf',
  Text = 'text',
}

interface IRow {
  kind: string
}

function mapData(data) {
  if (!data) {
    return data
  }

  data.tasks_status.forEach((task) => {
    if (task.state === 1) {
      let task_elapsed_secs = data.server_time - task.started_at
      let progress =
        task_elapsed_secs / data.task_group_status.profile_duration_secs
      if (progress > 0.99) {
        progress = 0.99
      }
      if (progress < 0) {
        progress = 0
      }
      task.progress = progress
    }

    // set profiling output options for previous generated SVG files and protobuf files.
    if (task.raw_data_type === RawDataType.Protobuf) {
      task.view_options = [
        ViewOptions.FlameGraph,
        ViewOptions.Graph,
        ViewOptions.Download,
      ]
    } else if (task.raw_data_type === RawDataType.Text) {
      task.view_options = [ViewOptions.Text]
    } else if (task.raw_data_type === '') {
      switch (task.target.kind) {
        case 'tidb':
        case 'pd':
          task.view_options = [ViewOptions.Graph]
          break
        case 'tikv':
        case 'tiflash':
          task.view_options = [ViewOptions.FlameGraph]
          break
      }
    }
  })

  return data
}

function isFinished(data) {
  const groupState = data?.task_group_status?.state
  return groupState === 2 || groupState === 3
}

async function getActionToken(
  id: string,
  apiType: string
): Promise<string | undefined> {
  const res = await client.getInstance().getActionToken(id, apiType)
  const token = res.data
  if (!token) {
    return
  }
  return token
}

interface IRecord extends ProfilingTaskModel {
  view_options: ViewOptions[]
}

export default function Page() {
  const { t } = useTranslation()
  const { id } = useQueryParams()

  const {
    data: respData,
    isLoading,
    error,
  } = useClientRequestWithPolling(
    (reqConfig) => client.getInstance().getProfilingGroupDetail(id, reqConfig),
    {
      shouldPoll: (data) => !isFinished(data),
    }
  )

  const data = useMemo(() => mapData(respData), [respData])

  const profileDuration =
    respData?.task_group_status?.profile_duration_secs || 0

  const [tableData, groupData] = useMemo(() => {
    const newRows: IRow[] = []
    const newGroups: IGroup[] = []
    let startIndex = 0
    const tasks = data?.tasks_status ?? []
    for (const instanceKind of ['pd', 'tidb', 'tikv', 'tiflash']) {
      tasks.forEach((task) => {
        if (task.target.kind === instanceKind) {
          newRows.push({
            ...task,
            kind: InstanceKindName[instanceKind],
          })
        }
      })

      if (newRows.length - startIndex > 0) {
        newGroups.push({
          key: InstanceKindName[instanceKind],
          name: InstanceKindName[instanceKind],
          startIndex: startIndex,
          count: newRows.length - startIndex,
        })
        startIndex = newRows.length
      }
    }
    return [newRows, newGroups]
  }, [data])

  const openResult = useMemoizedFn(async (openAs: string, rec: IRecord) => {
    const isProtobuf = rec.raw_data_type === RawDataType.Protobuf
    let token: string | undefined
    let profileURL: string

    switch (openAs) {
      case ViewOptions.Download:
        token = await getActionToken(rec.id + '', 'single_download')
        if (!token) {
          return
        }

        window.location.href = `${client.getBasePath()}/profiling/single/download?token=${token}`
        break
      case ViewOptions.FlameGraph:
        token = await getActionToken(rec.id + '', 'single_view')
        if (!token) {
          return
        }
        profileURL = `${client.getBasePath()}/profiling/single/view?token=${token}`
        if (isProtobuf) {
          const titleOnTab = rec.target?.kind + '_' + rec.target?.display_name
          profileURL = `${publicPathPrefix}/speedscope/#profileURL=${encodeURIComponent(
            // protobuf can be rendered to flamegraph by speedscope
            profileURL + `&output_type=protobuf`
          )}&title=${titleOnTab}`
        }

        window.open(`${profileURL}`, '_blank')
        break
      case ViewOptions.Graph:
      case ViewOptions.Text:
        token = await getActionToken(rec.id + '', 'single_view')
        if (!token) {
          return
        }
        profileURL = `${client.getBasePath()}/profiling/single/view?token=${token}&output_type=${openAs}`

        window.open(`${profileURL}`, '_blank')
        break
    }
  })

  const columns = useMemo(
    () => [
      {
        name: t('instance_profiling.detail.table.columns.instance'),
        key: 'instance',
        minWidth: 100,
        maxWidth: 200,
        onRender: (record) => record.target.display_name,
      },
      {
        name: t('instance_profiling.detail.table.columns.content'),
        key: 'content',
        minWidth: 100,
        maxWidth: 100,
        onRender: (record) => {
          if (record.profiling_type === 'cpu') {
            return `CPU - ${profileDuration}s`
          } else {
            return upperFirst(record.profiling_type)
          }
        },
      },
      {
        name: t('instance_profiling.detail.table.columns.status'),
        key: 'status',
        minWidth: 100,
        maxWidth: 150,
        onRender: (record) => {
          if (record.state === taskState.Running) {
            return (
              <Badge
                status="processing"
                text={t('instance_profiling.detail.table.status.running')}
              />
            )
          } else if (record.state === taskState.Error) {
            return (
              <Badge
                status="error"
                text={t('instance_profiling.detail.table.status.error')}
              />
            )
          } else if (record.state === taskState.Skipped) {
            return (
              <Tooltip
                title={t(
                  'instance_profiling.detail.table.status.skipped_tooltip'
                )}
              >
                <Space>
                  <Badge
                    status="default"
                    text={t('instance_profiling.detail.table.status.skipped')}
                  />
                  <QuestionCircleOutlined />
                </Space>
              </Tooltip>
            )
          } else {
            return (
              <Badge
                status="success"
                text={t('instance_profiling.detail.table.status.finished')}
              />
            )
          }
        },
      },
      {
        name: t('instance_profiling.detail.table.columns.view_as.title'),
        key: 'view_as',
        minWidth: 250,
        maxWidth: 400,
        onRender: (record) => {
          if (record.state === taskState.Error) {
            return (
              <a
                href="javascript:;"
                onClick={() => {
                  Modal.error({
                    title: 'Profile Error',
                    content: record.error,
                  })
                }}
              >
                {t('instance_profiling.detail.table.columns.view_as.error')}
              </a>
            )
          }

          if (record.state === taskState.Running) {
            return (
              <div style={{ width: 150 }}>
                <Progress
                  percent={Math.round(record.progress * 100)}
                  size="small"
                  width={200}
                />
              </div>
            )
          }

          if (record.state !== taskState.Success) {
            return <></>
          }

          const rec = record as IRecord
          return (
            <Space>
              {rec.view_options.map((action) => {
                return (
                  <a
                    href="javascript:;"
                    onClick={() => openResult(action, record)}
                    key={action}
                  >
                    {t(
                      `instance_profiling.detail.table.columns.view_as.${action}`
                    )}
                  </a>
                )
              })}
            </Space>
          )
        },
      },
    ],
    [t, profileDuration, openResult]
  )

  const handleDownloadGroup = useCallback(async () => {
    const res = await client.getInstance().getActionToken(id, 'group_download')
    const token = res.data
    if (!token) {
      return
    }
    window.location.href = `${client.getBasePath()}/profiling/group/download?token=${token}`
  }, [id])

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Head
        title={t('instance_profiling.detail.head.title')}
        back={
          <Link to={`/instance_profiling`}>
            <ArrowLeftOutlined /> {t('instance_profiling.detail.head.back')}
          </Link>
        }
        titleExtra={
          <Button
            disabled={!isFinished(data)}
            type="primary"
            onClick={handleDownloadGroup}
          >
            {t('instance_profiling.detail.download')}
          </Button>
        }
      />
      <div style={{ height: '100%', position: 'relative' }}>
        <ScrollablePane>
          {respData && (
            <Card noMarginTop noMarginBottom>
              <Descriptions>
                <Descriptions.Item
                  span={2}
                  label={t('instance_profiling.detail.head.start_at')}
                >
                  <DateTime.Calendar
                    unixTimestampMs={
                      respData.task_group_status!.started_at! * 1000
                    }
                  />
                </Descriptions.Item>
              </Descriptions>
            </Card>
          )}
          <CardTable
            cardNoMarginTop
            cardNoMarginBottom
            disableSelectionZone
            loading={isLoading}
            columns={columns}
            items={tableData}
            errors={[error]}
            groups={groupData}
            hideLoadingWhenNotEmpty
            extendLastColumn
            compact
          />
        </ScrollablePane>
      </div>
    </div>
  )
}
