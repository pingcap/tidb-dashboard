import client from '@pingcap-incubator/dashboard_client'
import React, { useCallback, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { Button, Badge, Progress } from 'antd'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Head } from '@pingcap-incubator/dashboard_components'
import { CardTableV2 } from '@/components'
import { useClientRequestWithPolling } from '@/utils/useClientRequest'

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
  if (!data) {
    return false
  }
  return data.task_group_status.state === 2
}

export default function Page() {
  const { t } = useTranslation()
  const { id } = useParams()

  const { data: respData, isLoading } = useClientRequestWithPolling(
    (cancelToken) =>
      client.getInstance().getProfilingGroupDetail(id, { cancelToken }),
    {
      shouldPoll: (data) => !isFinished(data),
    }
  )

  const data = useMemo(() => mapData(respData), [respData])

  const handleDownload = useCallback(async () => {
    const res = await client.getInstance().getProfilingGroupDownloadToken(id)
    const token = res.data
    if (!token) {
      return
    }
    window.location = `${client.getBasePath()}/profiling/group/download?token=${token}`
  }, [id])

  const columns = useMemo(
    () => [
      {
        name: t('instance_profiling.detail.table.columns.instance'),
        key: 'instance',
        minWidth: 150,
        maxWidth: 400,
        onRender: (record) => record.target.display_name,
      },
      {
        name: t('instance_profiling.detail.table.columns.kind'),
        key: 'kind',
        minWidth: 100,
        maxWidth: 150,
        onRender: (record) => record.target.kind,
      },
      {
        name: t('instance_profiling.detail.table.columns.status'),
        key: 'status',
        minWidth: 150,
        maxWidth: 200,
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
    ],
    [t]
  )

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
            onClick={handleDownload}
          >
            {t('instance_profiling.detail.download')}
          </Button>
        }
      />
      <CardTableV2
        loading={isLoading && !data}
        columns={columns}
        items={data?.tasks_status || []}
        getKey={(row) => row.id}
      />
    </div>
  )
}
