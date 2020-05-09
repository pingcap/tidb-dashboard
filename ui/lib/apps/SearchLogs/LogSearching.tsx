import { Empty } from 'antd'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { SearchHeader } from './components'
import { Card } from '@lib/components'

export default function LogSearchingPage() {
  const { t } = useTranslation()

  return (
    <div>
      <Card>
        <SearchHeader />
      </Card>
      <Empty description={t('search_logs.page.intro')}>
        {t('search_logs.page.view')}{' '}
        <Link to="/search_logs/history">
          {t('search_logs.page.search_histroy')}
        </Link>
      </Empty>
    </div>
  )
}
