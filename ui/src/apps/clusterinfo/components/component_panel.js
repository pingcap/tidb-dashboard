import React from 'react';
import { Row, Col } from 'antd';
import alive_dead_cnt from './utils';

import styles from './component_panel.module.less';

export default class ComponentPanel extends React.Component {
  render() {
    const [alive_cnt, down_cnt] = alive_dead_cnt(this.props.datas);
    return (
      <div className="component-panel">
        <h3>{this.props.name}</h3>

        <Row gutter={[16, 16]}>
          <Col span={12}>
            <p className="desc-text">Up</p>
            <p className="alive-cnt">{alive_cnt}</p>
          </Col>

          <Col span={12}>
            <p className="desc-text">ABNORMAL</p>
            <p className="down-cnt">{down_cnt}</p>
          </Col>
        </Row>
      </div>
    );
  }
}
