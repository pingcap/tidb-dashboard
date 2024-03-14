import {
  LogsearchCreateTaskGroupRequest,
  ModelRequestTargetNode
} from '@lib/client'
import { Button, Form, Input, Select, Modal } from 'antd'
import React, { useState, useCallback, useRef, useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useMount } from 'ahooks'
import {
  TimeRangeSelector,
  TimeRange,
  calcTimeRange,
  InstanceSelect,
  IInstanceSelectRefProps
} from '@lib/components'

import { ValidLogLevels, LogLevelText } from '../utils'
import { SearchLogsContext } from '../context'

interface Props {
  taskGroupID?: number
}

interface IFormProps {
  timeRange?: TimeRange
  logLevel?: number
  instances?: string[]
  keywords?: string
}

export default function SearchHeader({ taskGroupID }: Props) {
  const ctx = useContext(SearchLogsContext)

  const { t } = useTranslation()
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [isSubmitting, setSubmitting] = useState(false)
  const instanceSelect = useRef<IInstanceSelectRefProps>(null)

  useMount(() => {
    async function fetchData() {
      if (!taskGroupID) {
        return
      }
      const res = await ctx!.ds.logsTaskgroupsIdGet(String(taskGroupID))
      const { task_group, tasks } = res.data
      const { start_time, end_time, min_level, patterns } =
        task_group?.search_request ?? {}
      const fieldsValue: IFormProps = {
        timeRange: {
          type: 'absolute',
          value: [start_time! / 1000, end_time! / 1000]
        },
        logLevel: min_level || 2,
        instances: (tasks ?? [])
          .filter((t) => t.target && t.target!.display_name)
          .map((t) => t.target!.display_name!),
        keywords: (patterns ?? []).join(' ')
      }
      form.setFieldsValue(fieldsValue)
    }
    fetchData()
  })

  const handleSearch = useCallback(
    async (fieldsValue: IFormProps) => {
      if (
        !fieldsValue.instances ||
        fieldsValue.instances.length === 0 ||
        !fieldsValue.logLevel ||
        !fieldsValue.timeRange
      ) {
        Modal.error({
          content: 'Some required fields are not filled'
        })
        return
      }
      if (!instanceSelect.current) {
        Modal.error({
          content: 'Internal error: Instance select is not ready'
        })
        return
      }

      const targets: ModelRequestTargetNode[] = instanceSelect
        .current!.getInstanceByKeys(fieldsValue.instances)
        .map((instance) => {
          let port
          switch (instance.instanceKind) {
            case 'pd':
            case 'tikv':
            case 'tiflash':
            case 'ticdc':
            case 'tso':
            case 'scheduling':
              port = instance.port
              break
            case 'tidb':
            case 'tiproxy':
              port = instance.status_port
              break
          }
          return {
            kind: instance.instanceKind,
            display_name: instance.key,
            ip: instance.ip,
            port
          }
        })
        .filter((i) => i.port != null)

      const [startTime, endTime] = calcTimeRange(fieldsValue.timeRange)

      const req: LogsearchCreateTaskGroupRequest = {
        targets,
        request: {
          start_time: startTime * 1000, // unix millionsecond
          end_time: endTime * 1000, // unix millionsecond
          min_level: fieldsValue.logLevel,
          patterns: (fieldsValue.keywords ?? '').split(/\s+/) // 'foo boo' => ['foo', 'boo']
        }
      }

      try {
        setSubmitting(true)
        const result = await ctx!.ds.logsTaskgroupPut(req)
        const id = result?.data?.task_group?.id
        if (id) {
          navigate(`/search_logs/detail?id=${id}`)
        }
      } finally {
        setSubmitting(false)
      }
    },
    [navigate, ctx]
  )

  return (
    <Form
      id="search_form"
      layout="inline"
      onFinish={handleSearch}
      form={form}
      initialValues={{
        timeRange: null,
        logLevel: 2,
        instances: []
      }}
    >
      <Form.Item name="timeRange" rules={[{ required: true }]}>
        <TimeRangeSelector />
      </Form.Item>
      <Form.Item name="logLevel" rules={[{ required: true }]}>
        <Select style={{ width: 100 }}>
          {ValidLogLevels.map((val) => (
            <Select.Option key={val} value={val}>
              {LogLevelText[val]}
            </Select.Option>
          ))}
        </Select>
      </Form.Item>
      <Form.Item name="instances" rules={[{ required: true }]}>
        <InstanceSelect
          ref={instanceSelect}
          defaultSelectAll
          enableTiFlash
          style={{ width: 320 }}
          data-e2e="log_search_instances"
          dropContainerProps={
            { 'data-e2e': 'log_search_instances_drop' } as any
          }
          getTiDBTopology={ctx!.ds.getTiDBTopology}
          getStoreTopology={ctx!.ds.getStoreTopology}
          getPDTopology={ctx!.ds.getPDTopology}
          getTiCDCTopology={ctx!.ds.getTiCDCTopology}
          getTiProxyTopology={ctx!.ds.getTiProxyTopology}
          getTSOTopology={ctx!.ds.getTSOTopology}
          getSchedulingTopology={ctx!.ds.getSchedulingTopology}
        />
      </Form.Item>
      <Form.Item name="keywords">
        <Input
          data-e2e="log_search_keywords"
          placeholder={t('search_logs.common.keywords_placeholder')}
          style={{ width: 300 }}
        />
      </Form.Item>
      <Form.Item>
        <Button
          data-e2e="log_search_submit"
          type="primary"
          htmlType="submit"
          loading={isSubmitting}
        >
          {t('search_logs.common.search')}
        </Button>
      </Form.Item>
    </Form>
  )
}
