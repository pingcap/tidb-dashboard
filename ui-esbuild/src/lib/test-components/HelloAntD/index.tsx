import React from 'react'
import { Button, Switch, Space, DatePicker } from 'antd'

import styles from './style.module.less'

export default function HelloAntD() {
  return (
    <div className={styles['hello-antd-container']}>
      <Space>
        <Button>Hello Antd</Button>
        <Switch />
        <DatePicker />
      </Space>
    </div>
  )
}
