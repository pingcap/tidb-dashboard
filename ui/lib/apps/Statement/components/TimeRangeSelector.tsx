import React from 'react'
import { Dropdown, Button, Slider } from 'antd'
import { ClockCircleOutlined, DownOutlined } from '@ant-design/icons'

import styles from './TimeRangeSelector.module.less'

export default function TimeRangeSelector() {
  const dropdownContent = (
    <div className={styles.dropdown_content_container}>
      <div>常用时间范围</div>
      <div style={{ display: 'flex' }}>
        <div>最近 30 min</div>
        <div>最近 1 hour</div>
        <div>最近 3 hour</div>
      </div>
      <div style={{ display: 'flex' }}>
        <div>最近 6 hour</div>
        <div>最近 12 hour</div>
        <div>最近 1 day</div>
      </div>
      <div>常用时间范围</div>
      <Slider min={1} max={60} />
    </div>
  )
  return (
    <Dropdown overlay={dropdownContent} trigger={['click']}>
      <Button icon={<ClockCircleOutlined />}>
        Recent 1 hour
        <DownOutlined />
      </Button>
    </Dropdown>
  )
}
