import { Divider } from 'antd'
import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowLeftOutlined } from '@ant-design/icons'

import { Card, Head } from '@lib/components'
import {
  ComparisonCharts,
  deleteSpecialTimeRangeQuery
} from './charts/ComparisonCharts'
import { Selections } from './Selections'
import { createUrlSearchParams, useUrlSelection } from '../ListV2/Selections'

export const SlowQueryComparison: React.FC = () => {
  const { t } = useTranslation()
  const [urlSelection, setUrlSelection] = useUrlSelection()
  const backURL = useMemo(() => {
    const urlParams = createUrlSearchParams(urlSelection)
    deleteSpecialTimeRangeQuery(urlParams)
    return `/slow_query/v2?${urlParams.toString()}`
  }, [urlSelection])

  return (
    <>
      <Head
        title={t('slow_query_v2.detail.head.title')}
        back={
          <Link to={backURL} replace>
            <ArrowLeftOutlined /> {t('slow_query.detail.head.back')}
          </Link>
        }
      >
        <Selections
          selection={urlSelection}
          onSelectionChange={setUrlSelection}
        />
      </Head>
      <Divider />
      <Card noMarginTop>
        <ComparisonCharts
          selection={urlSelection}
          onSelectionChange={setUrlSelection}
        />
      </Card>
    </>
  )
}
