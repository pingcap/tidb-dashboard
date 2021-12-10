import { Badge, Button, Progress, Menu, Dropdown } from 'antd'
import React, { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { usePersistFn } from 'ahooks'

import client from '@lib/client'
import { CardTable, DateTime, Head, Descriptions } from '@lib/components'
import { useClientRequestWithPolling } from '@lib/utils/useClientRequest'
import { InstanceKindName } from '@lib/utils/instanceTable'
import useQueryParams from '@lib/utils/useQueryParams'
import { ScrollablePane } from 'office-ui-fabric-react'
import { MenuInfo } from 'rc-menu/lib/interface'

enum ViewOption {
  FlameGraph = 'flamegraph',
  Graph = 'graph',
  Download = 'download',
}

enum taskState {
  Error,
  Running,
  Success,
}

enum RawDataType {
  Protobuf = 'protobuf',
}

function mapData(data, t) {
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
        ViewOption.FlameGraph,
        ViewOption.Graph,
        ViewOption.Download,
      ]
    } else if (task.raw_data_type === '') {
      switch (task.target.kind) {
        case 'tidb':
        case 'pd':
          task.view_options = [ViewOption.Graph]
          break
        case 'tikv':
        case 'tiflash':
          task.view_options = [ViewOption.FlameGraph]
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

function ViewResultButton({ rec, t }) {
  const openResult = usePersistFn(async (openAs: string) => {
    const isProtobuf = rec.raw_data_type === RawDataType.Protobuf
    let token: string | undefined
    let profileURL: string

    switch (openAs) {
      case ViewOption.Download:
        token = await getActionToken(rec.id, 'single_download')
        if (!token) {
          return
        }

        window.location.href = `${client.getBasePath()}/profiling/single/download?token=${token}`
        break
      case ViewOption.FlameGraph:
        token = await getActionToken(rec.id, 'single_view')
        if (!token) {
          return
        }

        profileURL = `${client.getBasePath()}/profiling/single/view?token=${token}`
        if (isProtobuf) {
          const titleOnTab = rec.target.kind + '_' + rec.target.display_name
          profileURL = `/dashboard/speedscope#profileURL=${encodeURIComponent(
            profileURL + `&output_type=${ViewOption.FlameGraph}`
          )}&title=${titleOnTab}`
        }

        window.open(`${profileURL}`, '_blank')
        break
      case ViewOption.Graph:
        token = await getActionToken(rec.id, 'single_view')
        if (!token) {
          return
        }

        profileURL =
          profileURL = `${client.getBasePath()}/profiling/single/view?token=${token}`

        if (isProtobuf) {
          profileURL = profileURL + `&output_type=${ViewOption.Graph}`
        }

        window.open(`${profileURL}`, '_blank')
    }
  })

  const menu = () => {
    return (
      <Menu onClick={(e) => openResult(e.key as string)}>
        {rec.view_options.map((option, idx) => {
          // skip the first option in menu since it has been show on the button.
          if (idx != 0) {
            return (
              <Menu.Item key={option}>
                {t(
                  `instance_profiling.detail.table.columns.selection.types.${option}`
                )}
              </Menu.Item>
            )
          }
        })}
      </Menu>
    )
  }

  const DropdownButton = () => {
    return (
      <Dropdown.Button
        disabled={rec.state !== taskState.Success}
        overlay={menu}
        onClick={() => openResult(`${rec.view_options[0]}`)}
      >
        {t(
          `instance_profiling.detail.table.columns.selection.types.${rec.view_options[0]}`
        )}
      </Dropdown.Button>
    )
  }

  if (rec.view_options.length > 1) {
    return <DropdownButton />
  } else {
    return (
      <>
        {rec.state === taskState.Success && (
          <Button
            disabled={rec.state !== taskState.Success}
            onClick={() => openResult(`${rec.view_options[0]}`)}
            style={{ width: 150 }}
          >
            {t(
              `instance_profiling.detail.table.columns.selection.types.${rec.view_options[0]}`
            )}
          </Button>
        )}
      </>
    )
  }
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

  const data = useMemo(() => mapData(respData, t), [respData])

  const profileDuration =
    respData?.task_group_status?.profile_duration_secs || 0

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
        name: t('instance_profiling.detail.table.columns.kind'),
        key: 'kind',
        minWidth: 100,
        maxWidth: 150,
        onRender: (record) => {
          return InstanceKindName[record.target.kind]
        },
      },
      {
        name: t('instance_profiling.detail.table.columns.content'),
        key: 'content',
        minWidth: 150,
        maxWidth: 250,
        onRender: (record) => {
          return `CPU Profiling - ${profileDuration}s`
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
            return <Badge status="error" text={record.error} />
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
          return <ViewResultButton rec={record} t={t} />
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
            items={data?.tasks_status || []}
            errors={[error]}
            hideLoadingWhenNotEmpty
            extendLastColumn
          />
        </ScrollablePane>
      </div>
    </div>
  )
}
