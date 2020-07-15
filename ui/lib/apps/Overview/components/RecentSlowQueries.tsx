import { RightOutlined } from '@ant-design/icons'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { DateTime } from '@lib/components'
import { SlowQueriesTable, useSlowQuery } from '@lib/apps/SlowQuery'
import { defSlowQueryColumnKeys } from '@lib/apps/SlowQuery/pages/List'
import { DEF_SLOW_QUERY_OPTIONS } from '@lib/apps/SlowQuery/utils/useSlowQuery'

export default function RecentSlowQueries() {
  const { t } = useTranslation()
  const {
    orderOptions,
    changeOrder,

    loadingSlowQueries,
    slowQueries,
    queryTimeRange,

    errors,
  } = useSlowQuery({ ...DEF_SLOW_QUERY_OPTIONS, limit: 10 }, false)

  return (
    <SlowQueriesTable
      key={`slow_query_${slowQueries.length}`}
      visibleColumnKeys={defSlowQueryColumnKeys}
      loading={loadingSlowQueries}
      slowQueries={slowQueries}
      orderBy={orderOptions.orderBy}
      desc={orderOptions.desc}
      onChangeOrder={changeOrder}
      errors={errors}
      title={
        <Link to="/slow_query">
          {t('overview.recent_slow_query.title')} <RightOutlined />
        </Link>
      }
      subTitle={
        <span>
          <DateTime.Calendar
            unixTimestampMs={queryTimeRange.beginTime * 1000}
          />{' '}
          ~{' '}
          <DateTime.Calendar unixTimestampMs={queryTimeRange.endTime * 1000} />
        </span>
      }
    />
  )
}
