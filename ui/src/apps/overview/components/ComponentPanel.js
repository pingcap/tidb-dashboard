import { Col, Row, Card, Skeleton, Tooltip, Typography } from 'antd'
import React from 'react'
import { useTranslation } from 'react-i18next'
import styles from './ComponentPanel.module.less'
import { ExclamationCircleOutlined } from '@ant-design/icons'
import { STATUS_UP, STATUS_TOMBSTONE } from '@/apps/clusterInfo/status/status'

const { Text } = Typography

function ComponentPanel({ data, field, clusterError }) {
  const { t } = useTranslation()

  let up_nodes = 0
  let abnormal_nodes = 0
  let has_error = false
  let error_hint

  if (clusterError) {
    has_error = true
    error_hint = clusterError
  }

  if (data && data[field]) {
    if (!data[field].err) {
      data[field].nodes.forEach((n) => {
        // NOTE: if node is tombstone,
        //  no counter should be incremented.
        if (n.status === STATUS_UP) {
          up_nodes++
        } else if (n.status !== STATUS_TOMBSTONE) {
          abnormal_nodes++
        }
      })
    } else {
      has_error = true
      error_hint = data[field].err
    }
  }

  let extra, title_style
  if (has_error) {
    title_style = 'danger'
    extra = (
      <Tooltip title={error_hint}>
        <ExclamationCircleOutlined
          style={{ marginLeft: '5px', fontSize: 15 }}
        />
      </Tooltip>
    )
  }

  let title = (
    <Text type={title_style}>
      {t('overview.status.nodes', { nodeType: field.toUpperCase() })}
      {extra}
    </Text>
  )

  return (
    <Card size="small" bordered={false} title={title}>
      {!data || has_error ? (
        <Skeleton active title={false} />
      ) : (
        <Row gutter={24}>
          <Col span={9}>
            <div className={styles.desc}>{t('overview.status.up')}</div>
            <div className={styles.alive}>{up_nodes}</div>
          </Col>
          <Col span={9}>
            <div className={styles.desc}>{t('overview.status.abnormal')}</div>
            <div
              className={
                abnormal_nodes === 0 || has_error ? styles.alive : styles.down
              }
            >
              {abnormal_nodes}
            </div>
          </Col>
        </Row>
      )}
    </Card>
  )
}

export default ComponentPanel
