import { Card, CardTabs, Pre, TimeRangeSelector } from '@lib/components'
import { Select, Space, Tooltip } from 'antd'
import React, { useEffect, useMemo } from 'react'
import { useResourceManagerContext } from '../context'
import { useClientRequest } from '@lib/utils/useClientRequest'
import { InfoCircleOutlined } from '@ant-design/icons'
import { useResourceManagerUrlState } from '../uilts/url-state'

const { Option } = Select

const WORKLOAD_TYPES = [
  'oltp_read_write',
  'oltp_read_only',
  'oltp_write_only',
  'tpcc'
]

const workloadTypeTooltip = `Select a workload type which is similar with your actual workload.

- oltp_read_write: mixed read & write
- oltp_read_only: read intensive  workload
- oltp_write_only: write intensive workload
- tpcc: write intensive workload`

const timeWindowTooltip = `Select the time window with classic workload in the past, with which TiDB can come a better estimation of RU capacity.

Time window length: 10 mins ~ 24 hours
`

const RECENT_SECONDS = [
  15 * 60,
  30 * 60,
  60 * 60,
  3 * 60 * 60,
  6 * 60 * 60,
  12 * 60 * 60,
  24 * 60 * 60
]

const HardwareCalibrate: React.FC = () => {
  const ctx = useResourceManagerContext()
  const [workloadType, setWorkloadType] = React.useState(WORKLOAD_TYPES[0])

  return (
    <div>
      <Space>
        <Select
          style={{ width: 200 }}
          value={workloadType}
          onChange={setWorkloadType}
        >
          {WORKLOAD_TYPES.map((item) => (
            <Option value={item} key={item}>
              {item}
            </Option>
          ))}
        </Select>
        <Tooltip title={<Pre>{workloadTypeTooltip}</Pre>}>
          <InfoCircleOutlined />
        </Tooltip>
      </Space>
    </div>
  )
}

const WorkloadCalibrate: React.FC = () => {
  const { timeRange, setTimeRange } = useResourceManagerUrlState()

  return (
    <div>
      <Space>
        <TimeRangeSelector
          recent_seconds={RECENT_SECONDS}
          value={timeRange}
          onChange={setTimeRange}
        />

        <Tooltip title={<Pre>{timeWindowTooltip}</Pre>}>
          <InfoCircleOutlined />
        </Tooltip>
      </Space>
    </div>
  )
}

export const EstimateCapacity: React.FC = () => {
  const tabs = useMemo(() => {
    return [
      {
        key: 'calibrate_by_hardware',
        title: 'Calibrate by Hardware',
        content: () => <HardwareCalibrate />
      },
      {
        key: 'calibrate_by_workload',
        title: 'Calibrate by Workload',
        content: () => <WorkloadCalibrate />
      }
    ]
  }, [])

  return (
    <Card title="Estimate Capacity">
      <CardTabs tabs={tabs} />
    </Card>
  )
}
