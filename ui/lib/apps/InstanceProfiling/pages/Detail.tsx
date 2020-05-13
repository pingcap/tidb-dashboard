import { Badge, Button, Progress } from 'antd'
import { ColumnActionsMode } from 'office-ui-fabric-react/lib/DetailsList'
import React, { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { usePersistFn } from '@umijs/hooks'

import client from '@lib/client'
import { CardTableV2, Head } from '@lib/components'
import { dummyColumn } from '@lib/utils/tableColumns'
import { useClientRequestWithPolling } from '@lib/utils/useClientRequest'

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
  })
  return data
}

function isFinished(data) {
  return data?.task_group_status?.state === 2
}

export default function Page() {
  const { t } = useTranslation()
  const { id } = useParams()

  const { data: respData, isLoading } = useClientRequestWithPolling(
    (cancelToken) =>
      client.getInstance().getProfilingGroupDetail(id, { cancelToken }),
    {
      shouldPoll: (data) => !isFinished(data),
      pollingInterval: 1000,
      immediate: true,
    }
  )

  const data = useMemo(() => mapData(respData), [respData])

  const columns = useMemo(
    () => [
      {
        name: t('instance_profiling.detail.table.columns.instance'),
        key: 'instance',
        minWidth: 150,
        maxWidth: 400,
        isResizable: true,
        columnActionsMode: ColumnActionsMode.disabled, // will move to CardTableV2
        onRender: (record) => record.target.display_name,
      },
      {
        name: t('instance_profiling.detail.table.columns.kind'),
        key: 'kind',
        minWidth: 100,
        maxWidth: 150,
        isResizable: true,
        columnActionsMode: ColumnActionsMode.disabled,
        onRender: (record) => record.target.kind,
      },
      {
        name: t('instance_profiling.detail.table.columns.status'),
        key: 'status',
        minWidth: 150,
        maxWidth: 200,
        isResizable: true,
        columnActionsMode: ColumnActionsMode.disabled,
        onRender: (record) => {
          if (record.state === 1) {
            return (
              <div style={{ width: 200 }}>
                <Progress
                  percent={Math.round(record.progress * 100)}
                  size="small"
                  width={200}
                />
              </div>
            )
          } else if (record.state === 0) {
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
      dummyColumn(),
    ],
    [t]
  )

  const handleRowClick = usePersistFn(
    async (rec, _idx, _ev: React.MouseEvent<HTMLElement>) => {
      const res = await client
        .getInstance()
        .getActionToken(rec.id, 'single_view')
      const token = res.data
      if (!token) {
        return
      }
      window.open(
        `${client.getBasePath()}/profiling/single/view?token=${token}`,
        '_blank'
      )
    }
  )

  const handleDownloadGroup = useCallback(async () => {
    const res = await client.getInstance().getActionToken(id, 'group_download')
    const token = res.data
    if (!token) {
      return
    }
    window.location = `${client.getBasePath()}/profiling/group/download?token=${token}` as any
  }, [id])

  return (
    <div>
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
      <CardTableV2
        loading={isLoading && !data}
        columns={columns}
        items={data?.tasks_status || []}
        onRowClicked={handleRowClick}
      />
    </div>
  )
}
