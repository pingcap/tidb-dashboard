import React from 'react'
import HostTable from '../components/HostTable'
import InstanceTable from '../components/InstanceTable'
import { Tabs } from 'antd'
import { useTranslation } from 'react-i18next'

const { TabPane } = Tabs

export default function ListPage() {
  const { t } = useTranslation()

  return (
    <Tabs defaultActiveKey="1" tabBarStyle={{ margin: 48, marginBottom: 0 }}>
      <TabPane tab={t('cluster_info.list.instance_table.title')} key="1">
        <InstanceTable />
      </TabPane>
      <TabPane tab={t('cluster_info.list.host_table.title')} key="2">
        <HostTable />
      </TabPane>
    </Tabs>
  )
}
