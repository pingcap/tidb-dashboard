import { Col, Row } from 'antd'
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
    <div className={styles.bottom}>
      <h3>{t('cluster_info.status.nodes', { nodeType: props.name })}</h3>

      <Row gutter={[16, 16]}>
        <Col span={8} className={styles.column}>
          <p className={styles.desc}>{t('cluster_info.status.up')}</p>
          <p className={styles.alive}>{alive_cnt}</p>
        </Col>

        <Col span={8} className={styles.column}>
          <p className={styles.desc}>{t('cluster_info.status.abnormal')}</p>
          <p className={down_cnt === 0 ? styles.alive : styles.down}>
            {down_cnt}
          </p>
        </Col>
      </Row>
    </div>
  )
}

export default ComponentPanel
