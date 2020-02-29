import React from 'react';
import { Icon } from 'antd';
import styles from './MonitorAlertBar.module.less';

// TODO: i18n
export default function MonitorAlertBar({ cluster }) {
  let am = '';
  let grafana = '';
  if (cluster.alert_manager !== null) {
    am = `http://${cluster.alert_manager.ip}:${cluster.alert_manager.port}`;
  }
  if (cluster.grafana !== null) {
    grafana = 'http://' + cluster.grafana.ip + ':' + cluster.grafana.port;
  }

  return (
    <div className={styles.desc}>
      <h2>MONITOR AND ALERT</h2>
      <p>
        <a href={grafana}>
          View Monitor <Icon type="right" style={{ marginLeft: '5px' }} />{' '}
        </a>
      </p>
      <p>
        <a href={am} className={styles.warn}>
          View 5 Alerts <Icon type="right" style={{ marginLeft: '5px' }} />{' '}
        </a>
      </p>

      <h2>PROBLEMS</h2>
      <p>
        <a href={''}>
          Run Diagnose <Icon type="right" style={{ marginLeft: '5px' }} />{' '}
        </a>
      </p>
    </div>
  );
}
