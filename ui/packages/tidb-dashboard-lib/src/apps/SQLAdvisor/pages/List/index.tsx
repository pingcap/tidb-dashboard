import React from 'react'

import styles from './List.module.less'
import InsightIndexTable from '../../component/InsightIndexTable'

import { Space, Button } from 'antd'

import { Card, Toolbar } from '@lib/components'

export default function SQLAdvisorOverview() {
  const handleIndexCheckUp = async () => {
    const res = await Promise.resolve()
  }
  return (
    <div className={styles.list_container}>
      <Card>
        <Toolbar className={styles.list_toolbar} data-e2e="statement_toolbar">
          <Space>Insight Index</Space>
          <Space>
            <Button onClick={handleIndexCheckUp}>Index Check Up</Button>
          </Space>
        </Toolbar>
      </Card>
      <InsightIndexTable />
    </div>
  )
}
