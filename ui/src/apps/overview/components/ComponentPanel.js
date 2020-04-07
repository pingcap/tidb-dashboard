import { Col, Row, Card, Skeleton, Icon, Tooltip, Typography } from 'antd'
import React from 'react'
import { useTranslation } from 'react-i18next'
import styles from './ComponentPanel.module.less'

const { Text } = Typography

function ComponentPanel({ data, field }) {
  const { t } = useTranslation()

  let up_nodes = 0
  let abnormal_nodes = 0
  let has_error = false
  let error_hint

  if (data && data.error) {
    has_error = true
    error_hint = data.error
  }

  if (data && data[field]) {
    if (!data[field].err) {
      data[field].nodes.forEach((n) => {
        if (n.status === 0) {
          abnormal_nodes++
        } else {
          up_nodes++
        }
      })
    } else {
      has_error = true
      error_hint = data[field].err
    }
  }

  let extra, title_style
  if (has_error) {
    // Note: once `has_error` is true, `data[field].err` must exists.
    up_nodes = '-'
    abnormal_nodes = '-'
    title_style = 'danger'
    extra = (
      <Tooltip title={error_hint}>
        <Icon type="warning" style={{ marginLeft: '5px', fontSize: 15 }} />
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
      {!data ? (
        <Skeleton active title={false} />
      ) : (
        <Row gutter={24}>
          <Col span={9}>
            <div className={styles.desc}>{t('overview.status.up')}</div>
            <div className={styles.alive}>{up_nodes}</div>
          </Col>
          <Col span={9}>
            <div className={styles.desc}>{t('overview.status.abnormal')}</div>
            {/*Note: If `has_error` is true, both "up" and "down" should be "-" with the sample color*/}
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
