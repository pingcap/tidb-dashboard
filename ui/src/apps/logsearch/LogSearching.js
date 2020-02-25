import React from 'react'
import {Link}from 'react-router-dom'
import {Empty, Row, Col, Alert, Button} from 'antd'
import { SearchHeader } from './components'

export default function LogSearchingPage() {
  const button = (
    <div>
      <Link to="/logsearch/detail">
        <Button type="link">
          查看
        </Button>
      </Link>
        <Button type="link">
          删除
        </Button>
    </div>
  )

  return (
    <div>
      <SearchHeader />
      <Alert
        message="日志搜索任务已经完成。"
        description={button}
        type="success"
        showIcon
      />
      <Row type="flex" align="bottom" style={{width: "100%", height: 500}}>
        <Col span={24}>
          <Empty />
        </Col>
      </Row>
    </div>
  )
}