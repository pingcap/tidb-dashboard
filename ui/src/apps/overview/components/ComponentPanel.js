import { Col, Row, Card, Skeleton, Icon, Tooltip } from 'antd'
import React from 'react'
import { useTranslation } from 'react-i18next'
import styles from './ComponentPanel.module.less'

function ComponentPanel({ data, field }) {
  const { t } = useTranslation()

  let up_nodes = 0
  let abnormal_nodes = 0
  let field_error = false

  if (data && data[field]) {
    if (!data[field].err) {
      data[field].nodes.forEach(n => {
        if (n.status === 0) {
          abnormal_nodes++
        } else {
          up_nodes++
        }
      })
    } else {
      field_error = true
    }
  }

  let title
  if (field_error) {
    // Note: once `field_error` is true, `data[field].err` must exists.
    up_nodes = '-'
    abnormal_nodes = '-'
    title = (
      <span style={{ color: 'red' }}>
        {' '}
        <Tooltip title={data[field].err}>
          {t('overview.status.nodes', { nodeType: field.toUpperCase() })}
          <Icon
            type="close-circle"
            style={{ color: 'red', marginLeft: '5px', fontSize: 15 }}
          />
        </Tooltip>
      </span>
    )
  } else {
    title = (
      <span className="style">
        {t('overview.status.nodes', { nodeType: field.toUpperCase() })}
      </span>
    )
  }

  return (
    <Card hoverable size="small" bordered={false} title={title}>
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
