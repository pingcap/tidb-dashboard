import React from 'react'
import styles from './style.module.less'

import { Button, Switch, Space } from 'antd'

export default function HelloAntD() {
  return (
    <div className={styles['hello-antd-container']}>
      <Space>
        <Button>Hello Antd</Button>
        <Switch />
      </Space>
    </div>
  )
}
