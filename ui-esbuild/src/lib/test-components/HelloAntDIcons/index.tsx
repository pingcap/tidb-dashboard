import React from 'react'

import { AreaChartOutlined, PieChartOutlined, BarChartOutlined } from '@ant-design/icons'

import styles from './style.module.less'

export default function HelloAntDIcons() {
  return (
    <div className={styles['hello-antd-icons-container']}>
      <AreaChartOutlined />
      <PieChartOutlined />
      <BarChartOutlined />
    </div>
  )
}
