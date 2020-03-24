import { Col, Row, Card, Skeleton } from 'antd'
import React from 'react'
import { useTranslation } from 'react-i18next'
import styles from './ComponentPanel.module.less'

function ComponentPanel({ data, field }) {
  const { t } = useTranslation()

  let up_nodes = 0
  let abnormal_nodes = 0

  if (data && data[field] && !data[field].err) {
    data[field].nodes.forEach((n) => {
      if (n.status === 0) {
        abnormal_nodes++
      } else {
        up_nodes++
      }
    })
  }

  return (
    <Card
      size="small"
      bordered={false}
      title={t('overview.status.nodes', { nodeType: field.toUpperCase() })}
    >
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
            <div className={abnormal_nodes === 0 ? styles.alive : styles.down}>
              {abnormal_nodes}
            </div>
          </Col>
        </Row>
      )}
    </Card>
  )
}

export default ComponentPanel
