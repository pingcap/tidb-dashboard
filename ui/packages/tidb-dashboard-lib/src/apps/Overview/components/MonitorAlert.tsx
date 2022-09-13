import React, { useContext, useEffect, useState } from 'react'
import { RightOutlined, WarningOutlined } from '@ant-design/icons'
import { Card, AnimatedSkeleton } from '@lib/components'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useClientRequest } from '@lib/utils/useClientRequest'
import { Space, Typography } from 'antd'
import { Stack } from 'office-ui-fabric-react/lib/Stack'
import { OverviewContext } from '../context'

export default function MonitorAlert() {
  const ctx = useContext(OverviewContext)

  const { t } = useTranslation()
  const [alertCounter, setAlertCounter] = useState(0)

  const { data: amData, isLoading: amIsLoading } = useClientRequest(
    ctx!.ds.getAlertManagerTopology
  )
  const { data: grafanaData, isLoading: grafanaIsLoading } = useClientRequest(
    ctx!.ds.getGrafanaTopology
  )

  useEffect(() => {
    if (!amData) {
      return
    }
    async function fetch() {
      let resp = await ctx!.ds.getAlertManagerCounts(
        `${amData!.ip}:${amData!.port}`,
        {
          handleError: 'custom'
        }
      )
      setAlertCounter(resp.data)
    }
    fetch()
  }, [amData, ctx])

  return (
    <Card title={t('overview.monitor_alert.title')} noMarginRight>
      <Stack tokens={{ childrenGap: 16 }}>
        <AnimatedSkeleton
          showSkeleton={grafanaIsLoading}
          paragraph={{ rows: 1 }}
        >
          {!grafanaData && (
            <Typography.Text type="warning">
              <Space>
                <WarningOutlined />
                {t('overview.monitor_alert.view_monitor_warn')}
              </Space>
            </Typography.Text>
          )}
          {grafanaData && (
            <a
              href={`http://${grafanaData.ip}:${grafanaData.port}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Space>
                {t('overview.monitor_alert.view_grafana_monitor')}
                <RightOutlined />
              </Space>
            </a>
          )}
        </AnimatedSkeleton>
        <AnimatedSkeleton showSkeleton={amIsLoading} paragraph={{ rows: 1 }}>
          {!amData && (
            <Typography.Text type="warning">
              <Space>
                <WarningOutlined />
                {t('overview.monitor_alert.view_alerts_warn')}
              </Space>
            </Typography.Text>
          )}
          {amData && (
            <a
              href={`http://${amData.ip}:${amData.port}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Space>
                <Typography.Text type={alertCounter > 0 ? 'danger' : undefined}>
                  {alertCounter === 0
                    ? t('overview.monitor_alert.view_zero_alerts')
                    : t('overview.monitor_alert.view_alerts', {
                        alertCount: alertCounter
                      })}
                </Typography.Text>
                <RightOutlined />
              </Space>
            </a>
          )}
        </AnimatedSkeleton>
        <div>
          <Link to={`/diagnose`}>
            <Space>
              {t('overview.monitor_alert.run_diagnose')}
              <RightOutlined />
            </Space>
          </Link>
        </div>
      </Stack>
    </Card>
  )
}
