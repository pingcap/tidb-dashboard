import { Col, Row, Card } from 'antd'
import React from 'react'
import { useTranslation } from 'react-i18next'
import styles from './ComponentPanel.module.less'

function ComponentPanel(props) {
  const { t } = useTranslation()
  let [alive_cnt, down_cnt] = [0, 0]
  const server_info = props.datas
  if (server_info !== null && server_info.err === null) {
    server_info.nodes.forEach(n => {
      if (n.status === 1) {
        alive_cnt++
      } else {
        down_cnt++
      }
    })
  }
  return (
    <Card
      size="small"
      bordered={false}
      title={t('cluster_info.status.nodes', { nodeType: props.name })}
    >
      <Row gutter={24}>
        <Col span={9}>
          <div className={styles.desc}>{t('cluster_info.status.up')}</div>
          <div className={styles.alive}>{alive_cnt}</div>
        </Col>
        <Col span={9}>
          <div className={styles.desc}>{t('cluster_info.status.abnormal')}</div>
          <div className={down_cnt === 0 ? styles.alive : styles.down}>
            {down_cnt}
          </div>
        </Col>
      </Row>
    </Card>
  )
}

export default ComponentPanel
