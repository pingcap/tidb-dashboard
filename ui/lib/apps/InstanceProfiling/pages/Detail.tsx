import { Badge, Button, Progress, Form, Select } from 'antd'
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

const profilingOutputTypeOptions = [
  { text: 'Flame Graph', value: 'flamegraph' },
  { text: 'Graph', value: 'graph' },
]
const defaultProfilingOutputTypeVal = 'flamegraph'

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
    if (task.profile_output_type === 'protobuf') {
      task.selected_output_type_val = defaultProfilingOutputTypeVal
      task.profilingOutputTypeOptions = profilingOutputTypeOptions
    } else {
      switch (task.target.kind) {
        case 'tidb':
        case 'pd':
          task.selected_output_type_val = 'graph'
          task.profilingOutputTypeOptions = profilingOutputTypeOptions[1]
          break
        case 'tiflash':
        case 'tikv':
          task.selected_output_type_val = 'flamegraph'
          task.profilingOutputTypeOptions = profilingOutputTypeOptions[0]
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

const handleInlineSelectChanged = (record, selected_value) => {
  record.selected_output_type_val = selected_value
}

function InlineSelect({ record }) {
  return (
    <Select
      style={{ width: 140 }}
      defaultValue={record.selected_output_type_val}
      onChange={(val) => handleInlineSelectChanged(record, val)}
    >
      {record.profilingOutputTypeOptions.map((option) => (
        <Select.Option key={option.value} value={option.value}>
          {option.text}
        </Select.Option>
      ))}
    </Select>
  )
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
        onRender: (record) => {
          return InstanceKindName[record.target.kind]
        },
      },
      {
        name: t('instance_profiling.detail.table.columns.content'),
        key: 'content',
        minWidth: 150,
        maxWidth: 300,
        onRender: (record) => {
          return `CPU Profiling - ${profileDuration}s`
        },
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
      {
        name: t('instance_profiling.detail.table.columns.output_type'),
        key: 'output_type',
        minWidth: 150,
        maxWidth: 200,
        ignoreRowClick: true,
        onRender: (record) => {
          return <InlineSelect record={record} />
        },
      },
      {
        name: '',
        key: 'view_result',
        minWidth: 100,
        maxWidth: 200,
        onRender: (record) => {
          return (
            <Button
              type="primary"
              onClick={() => handleViewResultClick(record)}
            >
              {t('instance_profiling.detail.table.columns.view_result')}
            </Button>
          )
        },
      },
    ],
    [t, profileDuration]
  )

  const handleViewResultClick = usePersistFn(async (rec) => {
    const res = await client.getInstance().getActionToken(rec.id, 'single_view')
    const token = res.data
    if (!token) {
      return
    }
    // make both generated graph(svg) file and protobuf file viewable online
    let profileURL = `${client.getBasePath()}/profiling/single/view?token=${token}`

    if (rec.profile_output_type === 'protobuf') {
      if (rec.selected_output_type_val === 'flamegraph') {
        const titleOnTab = rec.target.kind + '_' + rec.target.display_name
        profileURL = `/dashboard/speedscope#profileURL=${encodeURIComponent(
          profileURL
        )}&title=${titleOnTab}`
      } else {
        profileURL = profileURL + `&output_type=${rec.selected_output_type_val}`
      }
    }
    window.open(`${profileURL}`, '_blank')
  })

  const handleDownloadGroup = useCallback(async () => {
    const res = await client.getInstance().getActionToken(id, 'group_download')
    const token = res.data
    if (!token) {
      return
    }
    window.location.href = `${client.getBasePath()}/profiling/group/download?token=${token}`
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
      <CardTable
        disableSelectionZone
        loading={isLoading}
        columns={columns}
        items={data?.tasks_status || []}
        errors={[error]}
        hideLoadingWhenNotEmpty
        extendLastColumn
      />
    </div>
  )
}
