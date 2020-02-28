import React from 'react';
import { Row, Col } from 'antd';

export default class ComponentPanel extends React.Component {
  constructor(prop) {
    super(prop);
    // console.log(this.props);
  }

  render() {
    let [alive_cnt, down_cnt] = [0, 0];
    if (this.props.datas.err === null) {
      this.props.datas.nodes.forEach((n) => {
        console.log(n);
        if (n.status === 1) {
          alive_cnt ++;
        } else {
          down_cnt++;
        }
      })
    }
    return (
      <div>
        <p>{this.props.name}</p>

        <Row gutter={[16, 16]}>
          <Col span={12} >
            <p>Up</p>
            <p>{alive_cnt}</p>
          </Col>

          <Col span={12} >
            <p>ABNORMAL</p>
            <p>{down_cnt}</p>
          </Col>
        </Row>
      </div>
    )
  }
}