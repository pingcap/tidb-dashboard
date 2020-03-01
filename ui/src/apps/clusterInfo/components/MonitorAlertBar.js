import React from 'react';
import { Icon } from 'antd';
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next';
import styles from './MonitorAlertBar.module.less';

export default function MonitorAlertBar({ cluster }) {
  const { t } = useTranslation();
  let am = '';
  let grafana = '';
  if (cluster.alert_manager !== null) {
    am = `http://${cluster.alert_manager.ip}:${cluster.alert_manager.port}`;
  }
  if (cluster.grafana !== null) {
    grafana = `http://${cluster.grafana.ip}:${cluster.grafana.port}`;
  }

  return (
    <div className={styles.desc}>
      <h2>{t('cluster_info.monitor_alert.title')}</h2>
      <p>
        <a href={grafana}>
          {t('cluster_info.monitor_alert.view_monitor')}
          <Icon type="right" style={{ marginLeft: '5px' }} />
        </a>
      </p>
      <p>
        <a href={am} className={styles.warn}>
          {t('cluster_info.monitor_alert.view_alerts')}
          <Icon type="right" style={{ marginLeft: '5px' }} />
        </a>
      </p>

      <h2>{t('cluster_info.monitor_alert.problems')}</h2>
      <p>
        <Link
          to={`/diagnose`}
        >
          {t('cluster_info.monitor_alert.diagnose')}
          <Icon type="right" style={{ marginLeft: '5px' }} />
        </Link>
      </p>
    </div>
  );
}
