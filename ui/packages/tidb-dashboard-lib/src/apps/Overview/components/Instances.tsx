import { Link } from 'react-router-dom'
import React, { useContext, useMemo } from 'react'
import { Card, AnimatedSkeleton, Descriptions } from '@lib/components'
import { useTranslation } from 'react-i18next'
import { useClientRequest } from '@lib/utils/useClientRequest'
import { Typography, Row, Col, Space } from 'antd'
import {
  STATUS_OFFLINE,
  STATUS_TOMBSTONE,
  STATUS_UP
} from '@lib/apps/ClusterInfo/status/status'
import { RightOutlined, WarningOutlined } from '@ant-design/icons'
import { Stack } from 'office-ui-fabric-react/lib/Stack'

import styles from './Styles.module.less'
import { OverviewContext } from '../context'

function ComponentItem(props: {
  name: string
  resp: { data?: { status?: number }[]; isLoading: boolean; error?: any }
}) {
  const { name, resp } = props
  const [upNums, allNums] = useMemo(() => {
    if (!resp.data) {
      return [0, 0]
    }
    let up = 0
    let all = 0
    for (const instance of resp.data) {
      all++
      if (
        instance.status === STATUS_UP ||
        instance.status === STATUS_TOMBSTONE ||
        instance.status === STATUS_OFFLINE
      ) {
        up++
      }
    }
    return [up, all]
  }, [resp])
  // query TiCDC and TiProxy components returns 404 under TiDB 7.6.0
  const notFoundError = resp.error?.response?.status === 404

  return (
    <AnimatedSkeleton showSkeleton={resp.isLoading} paragraph={{ rows: 1 }}>
      {!resp.error && (
        <Descriptions column={1}>
          <Descriptions.Item label={name}>
            <Typography.Text type={upNums === allNums ? undefined : 'danger'}>
              <span className={styles.big}>{upNums}</span>
              <small> / {allNums}</small>
            </Typography.Text>
          </Descriptions.Item>
        </Descriptions>
      )}
      {resp.error && !notFoundError && (
        <Typography.Text type="danger">
          <Space>
            <WarningOutlined /> Error
          </Space>
        </Typography.Text>
      )}
    </AnimatedSkeleton>
  )
}

export default function Nodes() {
  const { t } = useTranslation()

  const ctx = useContext(OverviewContext)

  const tidbResp = useClientRequest(ctx!.ds.getTiDBTopology)
  const storeResp = useClientRequest(ctx!.ds.getStoreTopology)
  const tiKVResp = {
    ...storeResp,
    data: storeResp.data?.tikv
  }
  const tiFlashResp = {
    ...storeResp,
    data: storeResp.data?.tiflash
  }
  const pdResp = useClientRequest(ctx!.ds.getPDTopology)
  const tiCDCResp = useClientRequest(ctx!.ds.getTiCDCTopology)
  const tiProxyResp = useClientRequest(ctx!.ds.getTiProxyTopology)
  const tsoResp = useClientRequest(ctx!.ds.getTSOTopology)
  const schedulingResp = useClientRequest(ctx!.ds.getSchedulingTopology)

  return (
    <Card
      title={
        <Link to="/cluster_info">
          {t('overview.instances.title')}
          <RightOutlined />
        </Link>
      }
      noMarginRight
    >
      <Stack tokens={{ childrenGap: 16 }}>
        <Row>
          <Col span={12}>
            <ComponentItem name={t('distro.pd')} resp={pdResp} />
          </Col>
          <Col span={12}>
            <ComponentItem name={t('distro.tidb')} resp={tidbResp} />
          </Col>
        </Row>
        <Row>
          <Col span={12}>
            <ComponentItem name={t('distro.tikv')} resp={tiKVResp} />
          </Col>
          <Col span={12}>
            <ComponentItem name={t('distro.tiflash')} resp={tiFlashResp} />
          </Col>
        </Row>
        <Row>
          <Col span={12}>
            <ComponentItem name={t('distro.ticdc')} resp={tiCDCResp} />
          </Col>
          <Col span={12}>
            <ComponentItem name={t('distro.tiproxy')} resp={tiProxyResp} />
          </Col>
        </Row>
        <Row>
          <Col span={12}>
            <ComponentItem name={t('distro.tso')} resp={tsoResp} />
          </Col>
          <Col span={12}>
            <ComponentItem
              name={t('distro.scheduling')}
              resp={schedulingResp}
            />
          </Col>
        </Row>
      </Stack>
    </Card>
  )
}
