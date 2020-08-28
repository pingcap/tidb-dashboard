import React, { useMemo, useCallback } from 'react'
import { Root, Card, CardTable } from '@lib/components'
import client from '@lib/client'
import { useClientRequest } from '@lib/utils/useClientRequest'
import { IColumn } from 'office-ui-fabric-react/lib/DetailsList'
import { orderBy } from 'lodash'
import {
  CheckCircleFilled,
  WarningFilled,
  ExclamationCircleOutlined,
  LoadingOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { Space, Button, Tooltip, Spin } from 'antd'
import { ScrollablePane } from 'office-ui-fabric-react/lib/ScrollablePane'
import { Sticky, StickyPositionType } from 'office-ui-fabric-react/lib/Sticky'

import styles from './index.module.less'
import { useTranslation } from 'react-i18next'

const levelToOrder = {
  emergency: 3,
  critical: 2,
  warning: 1,
}

export default function () {
  const { t } = useTranslation()

  const { data, isLoading, sendRequest } = useClientRequest((cancelToken) => {
    return client.getInstance().metricsGetAlerts({ cancelToken })
  })

  const { data: amData } = useClientRequest((cancelToken) =>
    client.getInstance().getAlertManagerTopology({ cancelToken })
  )

  const handleAlertManagerLinkClick = useCallback(() => {
    if (amData) {
      window.location.href = `http://${amData.ip}:${amData.port}`
    }
  }, [amData])

  const handleRefresh = useCallback(() => {
    sendRequest()
  }, [sendRequest])

  const items = useMemo(() => {
    if (!data) {
      return []
    }
    if (data.status !== 'success') {
      return []
    }
    const d = data.data as any
    const items: any[] = []
    for (const group of d?.groups ?? []) {
      for (const rule of group?.rules ?? []) {
        if (rule?.type === 'alerting') {
          // pseudo field for sorting
          rule._hasAlerts =
            rule?.alerts?.filter((a) => a.state === 'firing').length > 0 ? 1 : 0
          rule._hasPendingAlerts =
            rule?.alerts?.filter((a) => a.state === 'pending').length > 0
              ? 1
              : 0
          rule._levelOrder = levelToOrder[rule.labels?.level] ?? 0
          items.push(rule)
        }
      }
    }

    return orderBy(
      items,
      ['_hasAlerts', '_hasPendingAlerts', '_levelOrder', 'name'],
      ['desc', 'desc', 'desc', 'asc']
    )
  }, [data])

  const columns = useMemo(() => {
    const c: IColumn[] = [
      {
        key: 'level',
        name: t('alerts.column.level'),
        minWidth: 150,
        maxWidth: 150,
        onRender: (item) => {
          const icon =
            !item._hasAlerts && !item._hasPendingAlerts ? (
              <CheckCircleFilled className={styles.success} />
            ) : (
              <WarningFilled
                className={styles[item.labels?.level ?? 'unknown']}
              />
            )

          const suffix = item._hasPendingAlerts ? (
            <Tooltip title={t('alerts.column.pending')}>
              <ExclamationCircleOutlined />
            </Tooltip>
          ) : null

          return (
            <span>
              {icon} {item.labels?.level ?? 'unknown'} {suffix}
            </span>
          )
        },
      },
      {
        key: 'name',
        name: t('alerts.column.name'),
        minWidth: 150,
        maxWidth: 300,
        fieldName: 'name',
      },
      {
        key: 'alert_instances',
        name: t('alerts.column.instances'),
        minWidth: 150,
        maxWidth: 300,
        onRender: (item) => {
          return item.alerts
            ?.map((alert) => alert.labels?.instance)
            .filter((v) => !!v)
            .join(', ')
        },
      },
    ]
    return c
  }, [])

  return (
    <Root>
      <ScrollablePane style={{ height: '100vh' }}>
        <Sticky stickyPosition={StickyPositionType.Header} isScrollSynced>
          <div style={{ display: 'flow-root' }}>
            <Card>
              <Space>
                <Button onClick={handleAlertManagerLinkClick}>
                  {t('alerts.toolbar.config')}
                </Button>
                <Button onClick={handleRefresh}>
                  <ReloadOutlined /> {t('alerts.toolbar.refresh')}
                </Button>
                {isLoading && (
                  <Spin
                    indicator={
                      <LoadingOutlined style={{ fontSize: 24 }} spin />
                    }
                  />
                )}
              </Space>
            </Card>
          </div>
        </Sticky>
        <CardTable
          cardNoMarginTop
          loading={isLoading}
          columns={columns}
          items={items}
        />
      </ScrollablePane>
    </Root>
  )
}
