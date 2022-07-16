import { Empty } from 'antd'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { Card } from '@lib/components'
import { SearchHeader } from '../components'

export default function LogSearch() {
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
