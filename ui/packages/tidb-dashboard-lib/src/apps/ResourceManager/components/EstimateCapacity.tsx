import {
  Card,
  CardTabs,
  ErrorBar,
  Pre,
  TimeRangeSelector,
  toTimeRangeValue
} from '@lib/components'
import {
  Alert,
  Col,
  Row,
  Select,
  Space,
  Statistic,
  Tooltip,
  Typography
} from 'antd'
import ReactMarkdown from 'react-markdown'
import React, { useEffect, useMemo } from 'react'
import { useResourceManagerContext } from '../context'
import { useClientRequest } from '@lib/utils/useClientRequest'
import { InfoCircleOutlined } from '@ant-design/icons'
import { useResourceManagerUrlState } from '../uilts/url-state'
import { TIME_WINDOW_RECENT_SECONDS, WORKLOAD_TYPES } from '../uilts/helpers'
import { useTranslation } from 'react-i18next'

const { Option } = Select
const { Paragraph, Text, Link } = Typography

const CapacityWarning: React.FC<{ totalRU: number; estimatedRU: number }> = ({
  totalRU,
  estimatedRU
}) => {
  const { t } = useTranslation()

  if (estimatedRU > 0 && totalRU > estimatedRU) {
    return (
      <div style={{ paddingTop: 16 }}>
        <Alert
          type="warning"
          showIcon
          message={t('resource_manager.estimate_capacity.exceed_warning')}
        />
      </div>
    )
  }

  return null
}

const HardwareCalibrate: React.FC<{ totalRU: number }> = ({ totalRU }) => {
  const ctx = useResourceManagerContext()
  const { workload, setWorkload } = useResourceManagerUrlState()
  const { data, isLoading, sendRequest, error } = useClientRequest(
    (reqConfig) => ctx.ds.getCalibrateByHardware({ workload }, reqConfig)
  )
  useEffect(() => {
    sendRequest()
  }, [workload])
  const estimatedRU = data?.estimated_capacity ?? 0
  const { t } = useTranslation()

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
        <Tooltip
          overlayStyle={{ maxWidth: 720 }}
          title={
            <ReactMarkdown>
              {t('resource_manager.estimate_capacity.workload_select_tooltip')}
            </ReactMarkdown>
          }
        >
          <InfoCircleOutlined />
        </Tooltip>
      </Space>

      <div style={{ paddingTop: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title={t('resource_manager.estimate_capacity.estimated_capacity')}
              value={estimatedRU}
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
              title={t('resource_manager.estimate_capacity.total_ru')}
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

      <CapacityWarning totalRU={totalRU} estimatedRU={estimatedRU} />
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
        { startTime: start, endTime: end },
        reqConfig
      )
    }
  )
  useEffect(() => {
    sendRequest()
  }, [timeRange])
  const estimatedRU = data?.estimated_capacity ?? 0

  const { t } = useTranslation()

  return (
    <div>
      <Space>
        <TimeRangeSelector
          recent_seconds={TIME_WINDOW_RECENT_SECONDS}
          value={timeRange}
          onChange={setTimeRange}
        />

        <Tooltip
          title={
            <Pre>
              {t(
                'resource_manager.estimate_capacity.time_window_select_tooltip'
              )}
            </Pre>
          }
        >
          <InfoCircleOutlined />
        </Tooltip>
      </Space>

      <div style={{ paddingTop: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title={t('resource_manager.estimate_capacity.estimated_capacity')}
              value={estimatedRU}
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
              title={t('resource_manager.estimate_capacity.total_ru')}
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

      <CapacityWarning totalRU={totalRU} estimatedRU={estimatedRU} />
    </div>
  )
}

export const EstimateCapacity: React.FC<{ totalRU: number }> = ({
  totalRU
}) => {
  const { t } = useTranslation()
  const tabs = useMemo(() => {
    return [
      {
        key: 'calibrate_by_hardware',
        title: t('resource_manager.estimate_capacity.calibrate_by_hardware'),
        content: () => <HardwareCalibrate totalRU={totalRU} />
      },
      {
        key: 'calibrate_by_workload',
        title: t('resource_manager.estimate_capacity.calibrate_by_workload'),
        content: () => <WorkloadCalibrate totalRU={totalRU} />
      }
    ]
  }, [totalRU, t])

  return (
    <Card title={t('resource_manager.estimate_capacity.title')}>
      <Paragraph>
        <blockquote>
          {t('resource_manager.estimate_capacity.ru_desc_line_1')}
          <br />
          {t('resource_manager.estimate_capacity.ru_desc_line_2')}
          <br />
          <br />
          <details>
            <summary>
              {t(
                'resource_manager.estimate_capacity.change_resource_allocation'
              )}
            </summary>
            <Typography>
              <Text>
                {t(
                  'resource_manager.estimate_capacity.resource_allocation_line_1'
                )}
              </Text>
              <div style={{ paddingTop: 8, paddingBottom: 8 }}>
                <Text code>
                  {`ALTER RESOURCE GROUP <resource group name> RU_PER_SEC=<#ru> [BURSTABLE];`}
                </Text>
              </div>
              <Text>
                {t(
                  'resource_manager.estimate_capacity.resource_allocation_ref'
                )}{' '}
                <Link
                  href="https://docs.pingcap.com/tidb/dev/tidb-resource-control"
                  target="_blank"
                >
                  {t(
                    'resource_manager.estimate_capacity.resource_allocation_user_manual'
                  )}
                </Link>
                .
              </Text>
            </Typography>
          </details>
        </blockquote>
      </Paragraph>

      <CardTabs tabs={tabs} />
    </Card>
  )
}
