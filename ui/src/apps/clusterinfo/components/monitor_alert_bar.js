import React from 'react';

export default class MonitorAlertBar extends React.Component {

  render() {
    let grafana = '';
    let am = '';
    const data = this.props.data;
    if (data.alert_manager !== null && data.alert_manager.err === null) {
      am = "http://" + data.alert_manager.ip + ":" + data.alert_manager.port;
    }
    if (data.grafana !== null && data.grafana.err === null) {
      grafana = "http://" + data.grafana.ip + ":" + data.grafana.port;
    }
    console.log(grafana);
    console.log(am);
      return (
        <div>
          <h2>Monitor and alert</h2>
          <a href={grafana}><p>Grafana</p></a>
          <a href={am}><p>AlertManager</p></a>
        </div>
      )
  }
}