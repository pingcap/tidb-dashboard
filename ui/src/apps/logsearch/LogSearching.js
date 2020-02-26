import { Col, Empty, Row } from 'antd'
import React from 'react'
import { SearchHeader } from './components'

export default function LogSearchingPage() {
  return (
    <div>
      <SearchHeader />
      <Row type="flex" align="bottom" style={{ width: "100%", height: 500 }}>
        <Col span={24}>
          <Empty
            description={
              <span>
                点击 <b>Search</b> 预览和下载日志
              </span>
            } />
        </Col>
      </Row>
    </div>
  )
}