import {
  Card,
  CardTabs,
  ErrorBar,
  Pre,
  TimeRangeSelector,
  toTimeRangeValue
} from '@lib/components'
import { Col, Row, Select, Space, Statistic, Tooltip, Typography } from 'antd'
import React, { useEffect, useMemo } from 'react'
import { useResourceManagerContext } from '../context'
import { useClientRequest } from '@lib/utils/useClientRequest'
import { InfoCircleOutlined } from '@ant-design/icons'
import { useResourceManagerUrlState } from '../uilts/url-state'
import { TIME_WINDOW_RECENT_SECONDS, WORKLOAD_TYPES } from '../uilts/helpers'

const { Option } = Select
const { Text, Link } = Typography

const workloadTypeTooltip = `Select a workload type which is similar with your actual workload.

- oltp_read_write: mixed read & write
- oltp_read_only: read intensive  workload
- oltp_write_only: write intensive workload
- tpcc: write intensive workload`

const timeWindowTooltip = `Select the time window with classic workload in the past, with which TiDB can come a better estimation of RU capacity.

Time window length: 10 mins ~ 24 hours
`

const HardwareCalibrate: React.FC<{ totalRU: number }> = ({ totalRU }) => {
  const ctx = useResourceManagerContext()
  const { workload, setWorkload } = useResourceManagerUrlState()
  const { data, isLoading, sendRequest, error } = useClientRequest(
    (reqConfig) => ctx.ds.getCalibrateByHardware({ workload }, reqConfig)
  )
  useEffect(() => {
    sendRequest()
  }, [workload])

  return (
    <div>
      <Space>
        <Select style={{ width: 200 }} value={workload} onChange={setWorkload}>
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

      <div style={{ paddingTop: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="Estimated Capacity"
              value={data?.estimated_capacity ?? 0}
              loading={isLoading}
              suffix={
                <Typography.Text type="secondary" style={{ fontSize: 14 }}>
                  RUs/sec
                </Typography.Text>
              }
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Total RU of user resource groups"
              value={totalRU}
            />
          </Col>
        </Row>
      </div>

      {error && (
        <div style={{ paddingTop: 16 }}>
          {' '}
          <ErrorBar errors={[error]} />{' '}
        </div>
      )}
    </div>
  )
}

const WorkloadCalibrate: React.FC<{ totalRU: number }> = ({ totalRU }) => {
  const ctx = useResourceManagerContext()
  const { timeRange, setTimeRange } = useResourceManagerUrlState()
  const { data, isLoading, sendRequest, error } = useClientRequest(
    (reqConfig) => {
      const [start, end] = toTimeRangeValue(timeRange)
      return ctx.ds.getCalibrateByActual(
        { startTime: start + '', endTime: end + '' },
        reqConfig
      )
    }
  )
  useEffect(() => {
    sendRequest()
  }, [timeRange])

  return (
    <div>
      <Space>
        <TimeRangeSelector
          recent_seconds={TIME_WINDOW_RECENT_SECONDS}
          value={timeRange}
          onChange={setTimeRange}
        />

        <Tooltip title={<Pre>{timeWindowTooltip}</Pre>}>
          <InfoCircleOutlined />
        </Tooltip>
      </Space>

      <div style={{ paddingTop: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="Estimated Capacity"
              value={data?.estimated_capacity ?? 0}
              loading={isLoading}
              suffix={
                <Typography.Text type="secondary" style={{ fontSize: 14 }}>
                  RUs/sec
                </Typography.Text>
              }
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Total RU of user resource groups"
              value={totalRU}
            />
          </Col>
        </Row>
      </div>

      {error && (
        <div style={{ paddingTop: 16 }}>
          {' '}
          <ErrorBar errors={[error]} />{' '}
        </div>
      )}
    </div>
  )
}

export const EstimateCapacity: React.FC<{ totalRU: number }> = ({
  totalRU
}) => {
  const tabs = useMemo(() => {
    return [
      {
        key: 'calibrate_by_hardware',
        title: 'Calibrate by Hardware',
        content: () => <HardwareCalibrate totalRU={totalRU} />
      },
      {
        key: 'calibrate_by_workload',
        title: 'Calibrate by Workload',
        content: () => <WorkloadCalibrate totalRU={totalRU} />
      }
    ]
  }, [totalRU])

  return (
    <Card title="Estimate Capacity">
      <Typography.Paragraph>
        Request Unit (RU) is a unified abstraction unit in TiDB for system
        resources, which is relavant to resource comsuption. Please notice the
        "estimated capacity" refers to a result that is hardware specs or past
        statistics, and may deviate from actual capacity.
      </Typography.Paragraph>

      <details style={{ marginBottom: 16 }}>
        <summary>Change the Resource Allocation</summary>
        <Typography>
          <Text>To change the resource allocation for resource group:</Text>
          <div style={{ paddingTop: 8, paddingBottom: 8 }}>
            <Text code>
              {`ALTER RESOURCE GROUP <resource group name> RU_PER_SEC=<#ru> \\[BURSTALE];`}
            </Text>
          </div>
          <Text>
            For detail information, please refer to{' '}
            <Link
              href="https://docs.pingcap.com/tidb/dev/tidb-resource-control"
              target="_blank"
            >
              user manual
            </Link>
            .
          </Text>
        </Typography>
      </details>

      <CardTabs tabs={tabs} />
    </Card>
  )
}
