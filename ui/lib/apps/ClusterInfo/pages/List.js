import { ScrollablePane } from 'office-ui-fabric-react/lib/ScrollablePane'
import { Sticky, StickyPositionType } from 'office-ui-fabric-react/lib/Sticky'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import HostTable from '../components/HostTable'
import InstanceTable from '../components/InstanceTable'
import CardTabs from '@lib/components/CardTabs'

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
      <CardTabs
        defaultActiveKey={tabKey}
        onChange={(key) => {
          navigate(`/cluster_info/${key}`)
        }}
        renderTabBar={renderTabBar}
        tabBarStyle={{ margin: 48, marginBottom: 0 }}
        animated={false}
      >
        <CardTabs.TabPane
          tab={t('cluster_info.list.instance_table.title')}
          key="instance"
        >
          <InstanceTable />
        </CardTabs.TabPane>
        <CardTabs.TabPane
          tab={t('cluster_info.list.host_table.title')}
          key="host"
        >
          <HostTable />
        </CardTabs.TabPane>
      </CardTabs>
    </ScrollablePane>
  )
}
