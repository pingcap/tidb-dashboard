import { Tabs } from 'antd'
import { ScrollablePane } from 'office-ui-fabric-react/lib/ScrollablePane'
import { Sticky, StickyPositionType } from 'office-ui-fabric-react/lib/Sticky'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import HostTable from '../components/HostTable'
import InstanceTable from '../components/InstanceTable'

const { TabPane } = Tabs

function renderTabBar(props, DefaultTabBar) {
  return (
    <Sticky stickyPosition={StickyPositionType.Both}>
      <DefaultTabBar {...props} />
    </Sticky>
  )
}

export default function ListPage() {
  const { tabKey } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()

  return (
    <ScrollablePane>
      <Tabs
        defaultActiveKey={tabKey}
        onChange={(key) => {
          navigate(`/cluster_info/${key}`)
        }}
        renderTabBar={renderTabBar}
        tabBarStyle={{ margin: 48, marginBottom: 0 }}
      >
        <TabPane
          tab={t('cluster_info.list.instance_table.title')}
          key="instance"
        >
          <InstanceTable />
        </TabPane>
        <TabPane tab={t('cluster_info.list.host_table.title')} key="host">
          <HostTable />
        </TabPane>
      </Tabs>
    </ScrollablePane>
  )
}
