import { Link } from 'react-router-dom'
import React, { useMemo } from 'react'
import { Card } from '@lib/components'
import { useTranslation } from 'react-i18next'
import { useClientRequest } from '@lib/utils/useClientRequest'
import client from '@lib/client'
import { Skeleton, Alert, Typography } from 'antd'
import {
  STATUS_UP,
  STATUS_TOMBSTONE,
  STATUS_OFFLINE,
} from '@lib/apps/ClusterInfo/status/status'
import { RightOutlined } from '@ant-design/icons'

export default function Nodes() {
  const { t } = useTranslation()
  const { data, isLoading, error } = useClientRequest((cancelToken) =>
    client.getInstance().topologyAllGet({ cancelToken })
  )

  const statusMap = useMemo(() => {
    if (!data) {
      return []
    }
    const r: any[] = []
    const components = ['tidb', 'tikv', 'tiflash', 'pd']
    components.forEach((componentName) => {
      if (!data[componentName]) {
        return
      }
      if (data[componentName].err) {
        r.push({ name: componentName, error: true })
        return
      }

      let normals = 0,
        abnormals = 0
      data[componentName].nodes.forEach((n) => {
        if (
          n.status === STATUS_UP ||
          n.status === STATUS_TOMBSTONE ||
          n.status === STATUS_OFFLINE
        ) {
          normals++
        } else {
          abnormals++
        }
      })

      if (normals > 0 || abnormals > 0) {
        r.push({ name: componentName, normals, abnormals })
      }
    })
    return r
  }, [data])

  return (
    <Card
      title={
        <Link to="/cluster_info">
          {t('overview.nodes.title')}
          <RightOutlined />
        </Link>
      }
      noMarginLeft
    >
      {isLoading && <Skeleton active />}
      {error && <Alert message="Error" type="error" showIcon />}
      {data &&
        statusMap.map((s) => {
          return (
            <p key={s.name}>
              <span>{t(`overview.nodes.component.${s.name}`)}: </span>
              {s.error && (
                <Typography.Text type="danger">Error</Typography.Text>
              )}
              {!s.error && (
                <span>
                  {s.normals} Up /{' '}
                  <Typography.Text
                    type={s.abnormals > 0 ? 'danger' : undefined}
                  >
                    {s.abnormals} Down
                  </Typography.Text>
                </span>
              )}
            </p>
          )
        })}
    </Card>
  )
}
