import { Col, Empty, Row } from 'antd'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { SearchHeader } from './components'
import { Card } from "@pingcap-incubator/dashboard_components"

export default function LogSearchingPage() {
  const { t } = useTranslation()

  return (
    <div>
      <Card title={t('search_logs.nav.search_logs')}>
        <SearchHeader />
      </Card>
      <Row type="flex" align="bottom" style={{ width: "100%", height: 300 }}>
        <Col span={24}>
          <Empty
            description={
              <span>
                {t('search_logs.page.intro')}
              </span>
            }>
            {t('search_logs.page.view')} <Link to="/search_logs/history">{t('search_logs.page.search_histroy')}</Link>
          </Empty>
        </Col>
      </Row>
    </div>
  )
}
