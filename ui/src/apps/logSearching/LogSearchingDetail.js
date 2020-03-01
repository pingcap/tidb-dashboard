import { Alert, Col, Row } from 'antd'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { SearchHeader, SearchProgress, SearchResult } from './components'

export default function LogSearchingDetail() {
  const { t } = useTranslation()
  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col span={18}>
          <SearchHeader />
          <Alert
            message={t('log_searching.page.tip')}
            type="info"
            showIcon
            style={{ marginTop: 14, marginBottom: 14 }}
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
