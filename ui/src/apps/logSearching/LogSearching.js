import { Col, Empty, Row } from 'antd'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { SearchHeader } from './components'

export default function LogSearchingPage() {
  const { t } = useTranslation()

  return (
    <div>
      <SearchHeader />
      <Row type="flex" align="bottom" style={{ width: "100%", height: 400 }}>
        <Col span={24}>
          <Empty
            description={
              <span>
                {t('log_searching.page.intro')}
              </span>
            }>
            {t('log_searching.page.view')} <Link to="/log/search/history">{t('log_searching.page.search_histroy')}</Link>
          </Empty>
        </Col>
      </Row>
    </div>
  )
}
