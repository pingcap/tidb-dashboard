import { Col, Row } from 'antd';
import React from 'react';
import styles from './component_panel.module.less';
import alive_dead_cnt from './utils';


export default class ComponentPanel extends React.Component {
  render() {
    const [alive_cnt, down_cnt] = alive_dead_cnt(this.props.datas);
    return (
      <div className="component-panel">
        <h3>{this.props.name} NODES</h3>

        <Row gutter={[16, 16]}>
          <Col span={8} className={styles.column}>
            <p className={styles.desc}>UP</p>
            <p className={styles.alive}>{alive_cnt}</p>
          </Col>

          <Col span={8} className={styles.column}>
            <p className={styles.desc}>ABNORMAL</p>
            <p className={styles.down}>{down_cnt}</p>
          </Col>
        </Row>
      </div>
    );
  }
}
