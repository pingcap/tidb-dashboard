import React from 'react'
import { Icon, Card } from 'antd'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import styles from './MonitorAlertBar.module.less'

export default function MonitorAlertBar({ cluster }) {
  const { t } = useTranslation()
  let am = ''
  let grafana = ''
  if (cluster.alert_manager !== null) {
    am = `http://${cluster.alert_manager.ip}:${cluster.alert_manager.port}`
  }
  if (cluster.grafana !== null) {
    grafana = `http://${cluster.grafana.ip}:${cluster.grafana.port}`
  }

  return (
    <div>
      <Card
        size="small"
        bordered={false}
        title={t('cluster_info.monitor_alert.title')}
      >
        <p>
          {!grafana ? (
            t('cluster_info.monitor_alert.view_monitor_warn')
          ) : (
            <a href={grafana}>
              {t('cluster_info.monitor_alert.view_monitor')}
              <Icon type="right" style={{ marginLeft: '5px' }} />
            </a>
          )}
        </p>
        <p>
          {!am ? (
            t('cluster_info.monitor_alert.view_alerts_warn')
          ) : (
            <a href={am} className={styles.warn}>
              {t('cluster_info.monitor_alert.view_alerts')}
              <Icon type="right" style={{ marginLeft: '5px' }} />
            </a>
          )}
        </p>
      </Card>
      <Card
        size="small"
        bordered={false}
        title={t('cluster_info.monitor_alert.problems')}
      >
        <p>
          <Link to={`/diagnose`}>
            {t('cluster_info.monitor_alert.run_diagnose')}
            <Icon type="right" style={{ marginLeft: '5px' }} />
          </Link>
        </p>
      </Card>
    </div>
  )
}
