import React, { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Space } from 'antd'
import {
  SelectionMode,
  Selection,
} from 'office-ui-fabric-react/lib/DetailsList'
import {
  MarqueeSelection,
  ISelection,
} from 'office-ui-fabric-react/lib/MarqueeSelection'
import { Tooltip } from 'antd'
import { getValueFormat } from '@baurine/grafana-value-formats'

import CopyLink from '@lib/components/CopyLink'
import formatSql from '@lib/utils/sqlFormatter'
import {
  Card,
  Bar,
  TextWrap,
  Descriptions,
  ErrorBar,
  Expand,
  HighlightSQL,
  TextWithInfo,
  CardTable,
  ICardTableProps,
} from '@lib/components'
import { TopsqlPlanItem } from '@lib/client'
import { DetailTable } from './DetailTable'
import type { SQLRecord } from '../TopSqlTable'

interface TopSqlDetailProps {
  record: SQLRecord
}

export function TopSqlDetail({ record }: TopSqlDetailProps) {
  const { t } = useTranslation()

  return (
    <div>
      <h1>{t('top_sql.detail.title')}</h1>
      <DetailTable record={record} />
    </div>
  )
}
