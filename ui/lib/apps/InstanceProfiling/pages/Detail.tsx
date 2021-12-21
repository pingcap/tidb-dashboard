import { Badge, Button, Progress, Tooltip } from 'antd'
import React, { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { usePersistFn } from 'ahooks'
import { Link } from 'react-router-dom'
import { ArrowLeftOutlined } from '@ant-design/icons'

import client, { ProfilingTaskModel } from '@lib/client'
import {
  CardTable,
  DateTime,
  Head,
  Descriptions,
  ActionsButton,
} from '@lib/components'
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

interface ActionButtonProps extends ProfilingTaskModel {
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

      newGroups.push({
        key: InstanceKindName[instanceKind],
        name: InstanceKindName[instanceKind],
        startIndex: startIndex,
        count: newRows.length - startIndex,
      })
      startIndex = newRows.length
    }
    return [newRows, newGroups]
  }, [data])

  const openResult = usePersistFn(
    async (openAs: string, rec: ActionButtonProps) => {
      const isProtobuf = rec.raw_data_type === RawDataType.Protobuf
      let token: string | undefined
      let profileURL: string

      switch (openAs) {
        case ViewOptions.Download:
          token = await getActionToken(rec.id, 'single_download')
          if (!token) {
            return
          }

          window.location.href = `${client.getBasePath()}/profiling/single/download?token=${token}`
          break
        case ViewOptions.FlameGraph:
          token = await getActionToken(rec.id, 'single_view')
          if (!token) {
            return
          }
          profileURL = `${client.getBasePath()}/profiling/single/view?token=${token}`
          if (isProtobuf) {
            const titleOnTab = rec.target?.kind + '_' + rec.target?.display_name
            profileURL = `${publicPathPrefix}/speedscope#profileURL=${encodeURIComponent(
              // protobuf can be rendered to flamegraph by speedscope
              profileURL + `&output_type=protobuf`
            )}&title=${titleOnTab}`
          }

          window.open(`${profileURL}`, '_blank')
          break
        case ViewOptions.Graph:
        case ViewOptions.Text:
          token = await getActionToken(rec.id, 'single_view')
          if (!token) {
            return
          }
          profileURL = `${client.getBasePath()}/profiling/single/view?token=${token}&output_type=${openAs}`

          window.open(`${profileURL}`, '_blank')
          break
      }
    }
  )

  const columns = useMemo(
    () => [
      {
        name: t('instance_profiling.detail.table.columns.instance'),
        key: 'instance',
        minWidth: 150,
        maxWidth: 250,
        onRender: (record) => record.target.display_name,
      },
      {
        name: t('instance_profiling.detail.table.columns.content'),
        key: 'content',
        minWidth: 150,
        maxWidth: 250,
        onRender: (record) => {
          if (record.profiling_type === 'cpu') {
            return `${record.profiling_type} - ${profileDuration}s`
          } else {
            return `${record.profiling_type}`
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
              <div style={{ width: 200 }}>
                <Progress
                  percent={Math.round(record.progress * 100)}
                  size="small"
                  width={200}
                />
              </div>
            )
          } else if (record.state === taskState.Error) {
            return (
              <Tooltip title={record.error}>
                <Badge status="error" text={record.error} />
              </Tooltip>
            )
          } else if (record.state == taskState.Skipped) {
            return (
              <Tooltip
                title={t('instance_profiling.detail.table.tooltip.skipped', {
                  kind: record.target.kind,
                  type: record.profiling_type,
                })}
              >
                <Badge
                  status="default"
                  text={t('instance_profiling.detail.table.status.skipped')}
                />
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
        name: t('instance_profiling.detail.table.columns.selection.actions'),
        key: 'output_type',
        minWidth: 150,
        maxWidth: 200,
        onRender: (record) => {
          const rec = record as ActionButtonProps
          const actions = rec.view_options.map((key) => ({
            key,
            text: t(
              `instance_profiling.detail.table.columns.selection.types.${key}`
            ),
          }))
          return (
            <ActionsButton
              actions={actions}
              disabled={rec.state != taskState.Success}
              onClick={(act) => openResult(act, rec)}
            />
          )
        },
      },
    ],
    [t, profileDuration]
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
      >
        {respData && (
          <Descriptions>
            <Descriptions.Item
              span={2}
              label={t('instance_profiling.detail.head.start_at')}
            >
              <DateTime.Calendar
                unixTimestampMs={respData.task_group_status!.started_at! * 1000}
              />
            </Descriptions.Item>
          </Descriptions>
        )}
      </Head>
      <div style={{ height: '100%', position: 'relative' }}>
        <ScrollablePane>
          <CardTable
            disableSelectionZone
            loading={isLoading}
            columns={columns}
            items={tableData}
            errors={[error]}
            groups={groupData}
            groupProps={{
              showEmptyGroups: true,
            }}
            hideLoadingWhenNotEmpty
            extendLastColumn
          />
        </ScrollablePane>
      </div>
    </div>
  )
}
