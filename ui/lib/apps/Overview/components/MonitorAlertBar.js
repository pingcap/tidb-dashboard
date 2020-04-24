import React, { useEffect, useState } from 'react'
import { RightOutlined } from '@ant-design/icons'
import { Skeleton } from 'antd'
import { Card } from '@lib/components'
import client from '@lib/client'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import styles from './MonitorAlertBar.module.less'

export default function MonitorAlertBar({ cluster }) {
  const { t } = useTranslation()
  const [alertCounter, setAlertCounter] = useState(0)

  useEffect(() => {
    const fetchNum = async () => {
      if (!cluster || !cluster.alert_manager) {
        return
      }
      let resp = await client
        .getInstance()
        .topologyAlertmanagerAddressCountGet(
          `${cluster.alert_manager.ip}:${cluster.alert_manager.port}`
        )
      setAlertCounter(resp.data)
    }
    fetchNum()
  }, [cluster])

  return (
    <Card title={t('overview.monitor_alert.title')} noMarginLeft>
      {!cluster ? (
        <Skeleton active />
      ) : (
        <>
          <p>
            {!cluster || !cluster.grafana ? (
              t('overview.monitor_alert.view_monitor_warn')
            ) : (
              <a href={`http://${cluster.grafana.ip}:${cluster.grafana.port}`}>
                {t('overview.monitor_alert.view_monitor')}
                <RightOutlined style={{ marginLeft: '5px' }} />
              </a>
            )}
          </p>
          <p>
            {!cluster || !cluster.alert_manager ? (
              t('overview.monitor_alert.view_alerts_warn')
            ) : (
              <a
                href={`http://${cluster.alert_manager.ip}:${cluster.alert_manager.port}`}
                className={alertCounter !== 0 ? styles.warn : undefined}
              >
                {alertCounter === 0
                  ? t('overview.monitor_alert.view_zero_alerts')
                  : t('overview.monitor_alert.view_alerts', {
                      alertCount: alertCounter,
                    })}
                <RightOutlined style={{ marginLeft: '5px' }} />
              </a>
            )}
          </p>
        </>
      )}
      <p>
        <Link to={`/diagnose`}>
          {t('overview.monitor_alert.run_diagnose')}
          <RightOutlined style={{ marginLeft: '5px' }} />
        </Link>
      </p>
    </Card>
  )
}
