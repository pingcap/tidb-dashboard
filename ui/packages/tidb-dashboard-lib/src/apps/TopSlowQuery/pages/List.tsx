import { BrushEndListener, BrushEvent } from '@elastic/charts'
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useMemo
} from 'react'
import { Space, Button, Spin, Alert, Tooltip, Drawer, Result } from 'antd'
import {
  LoadingOutlined,
  QuestionCircleOutlined,
  SettingOutlined
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useMount, useSessionStorage } from 'react-use'
import { useMemoizedFn } from 'ahooks'
import { sortBy } from 'lodash'
import formatSql from '@lib/utils/sqlFormatter'
import { TopsqlInstanceItem, TopsqlSummaryItem } from '@lib/client'
import {
  Card,
  toTimeRangeValue as _toTimeRangeValue,
  Toolbar,
  AutoRefreshButton,
  TimeRange,
  fromTimeRangeValue,
  TimeRangeValue,
  LimitTimeRange
} from '@lib/components'
import { useClientRequest } from '@lib/utils/useClientRequest'

import styles from './List.module.less'
import { useTopSlowQueryContext } from '../context'
import { Link } from 'react-router-dom'

export function TopSlowQueryList() {
  const containerRef = useRef<HTMLDivElement>(null)

  const ctx = useTopSlowQueryContext()

  // only for clinic
  const clusterInfo = useMemo(() => {
    const infos: string[] = []
    if (ctx?.cfg.orgName) {
      infos.push(`Org: ${ctx?.cfg.orgName}`)
    }
    if (ctx?.cfg.clusterName) {
      infos.push(`Cluster: ${ctx?.cfg.clusterName}`)
    }
    return infos.join(' | ')
  }, [ctx?.cfg.orgName, ctx?.cfg.clusterName])

  return (
    <>
      <div className={styles.container} ref={containerRef}>
        <Card noMarginBottom>
          {clusterInfo && (
            <div
              style={{
                marginBottom: 8,
                display: 'flex',
                flexDirection: 'row-reverse',
                justifyContent: 'space-between'
              }}
            >
              {clusterInfo}
              <span>
                <Link to="/slow_query">Slow Query Logs</Link>
                <span> | </span>
                <span>Top SlowQueries</span>
              </span>
            </div>
          )}
        </Card>
      </div>
    </>
  )
}
