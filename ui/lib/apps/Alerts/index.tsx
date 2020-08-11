import React, { useMemo, useCallback } from 'react'
import { Root, Card, CardTable } from '@lib/components'
import client from '@lib/client'
import { useClientRequest } from '@lib/utils/useClientRequest'
import { IColumn } from 'office-ui-fabric-react/lib/DetailsList'
import { orderBy } from 'lodash'
import { CheckCircleFilled, WarningFilled } from '@ant-design/icons'
import { Space, Button } from 'antd'
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

  const { data, isLoading } = useClientRequest((cancelToken) => {
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
          rule._hasAlerts = rule?.alerts?.length > 0 ? 1 : 0
          rule._levelOrder = levelToOrder[rule.labels?.level] ?? 0
          items.push(rule)
        }
      }
    }

    return orderBy(
      items,
      ['_hasAlerts', '_levelOrder', 'name'],
      ['desc', 'desc', 'asc']
    )
  }, [data])

  const columns = useMemo(() => {
    const c: IColumn[] = [
      {
        key: 'level',
        name: 'Level',
        minWidth: 150,
        maxWidth: 150,
        onRender: (item) => {
          const icon = !item._hasAlerts ? (
            <CheckCircleFilled className={styles.success} />
          ) : (
            <WarningFilled
              className={styles[item.labels?.level ?? 'unknown']}
            />
          )
          return (
            <span>
              {icon} {item.labels?.level ?? 'unknown'}
            </span>
          )
        },
      },
      {
        key: 'name',
        name: 'Name',
        minWidth: 150,
        maxWidth: 300,
        fieldName: 'name',
      },
      {
        key: 'alert_instances',
        name: 'Alert Instances',
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
