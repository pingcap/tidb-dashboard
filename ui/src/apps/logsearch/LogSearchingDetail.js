import { Alert, Col, Row } from 'antd'
import React from 'react'
import { SearchHeader, SearchProgress, SearchResult } from './components'

export default function LogSearchingDetail() {
  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col span={18}>
          <SearchHeader />
          <Alert
            message="预览仅显示前 500 项日志"
            type="info"
            showIcon
            style={{ marginBottom: 14 }}
          />
          <SearchResult />
        </Col>
        <Col span={6}>
          <SearchProgress />
        </Col>
      </Row>
    </div>
  )
}