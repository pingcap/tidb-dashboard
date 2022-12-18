import React from 'react'

import { List, Typography } from 'antd'
import { insightListData } from '../../SQLAdvisor/component/mock_data'

const InsightList = () => {
  return (
    <List
      header={<div>Insights</div>}
      footer={null}
      bordered
      dataSource={insightListData}
      renderItem={(item) => (
        <List.Item>
          <Typography.Link href={item.link}>{item.insight}</Typography.Link>
        </List.Item>
      )}
    />
  )
}

export default InsightList
