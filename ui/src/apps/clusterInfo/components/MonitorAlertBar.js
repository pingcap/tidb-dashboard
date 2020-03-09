import React, { useEffect, useState } from 'react';
import { Icon, Card, Skeleton } from 'antd'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import axios from 'axios';
import styles from './MonitorAlertBar.module.less'

export default function MonitorAlertBar({ cluster }) {
  const { t } = useTranslation()
  const [alertCounter, setAlertCounter] = useState(0);

  useEffect(() => {
    const fetchNum = async () => {
      if (cluster === null || cluster.alert_manager === null) {
        return
      }
      let resp = await axios.get(`http://${cluster.alert_manager.ip}:${cluster.alert_manager.port}/api/v2/alerts`)
      setAlertCounter(resp.data.length)
    };
    fetchNum();
  }, [cluster])

  return (
    <div>
      <Card
        size="small"
        bordered={false}
        title={t('cluster_info.monitor_alert.title')}
      >
        {!cluster ? (
          <Skeleton active title={false} />
        ) : (
          <>
            <p>
              {!cluster || !cluster.grafana ? (
                t('cluster_info.monitor_alert.view_monitor_warn')
              ) : (
                <a
                  href={`http://${cluster.grafana.ip}:${cluster.grafana.port}`}
                >
                  {t('cluster_info.monitor_alert.view_monitor')}
                  <Icon type="right" style={{ marginLeft: '5px' }} />
                </a>
              )}
            </p>
            <p>
              {!cluster || !cluster.alert_manager ? (
                t('cluster_info.monitor_alert.view_alerts_warn')
              ) : (
                <a
                  href={`http://${cluster.alert_manager.ip}:${cluster.alert_manager.port}`}
                  className={styles.warn}
                >
                  {alertCounter !== 0? t('cluster_info.monitor_alert.view_zero_alerts') : t('cluster_info.monitor_alert.view_alerts', {alertCount: alertCounter})}
                  <Icon type="right" style={{ marginLeft: '5px' }} />
                </a>
              )}
            </p>
          </>
        )}
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
