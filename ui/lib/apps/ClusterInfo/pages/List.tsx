import { ScrollablePane } from 'office-ui-fabric-react/lib/ScrollablePane'
import { Sticky, StickyPositionType } from 'office-ui-fabric-react/lib/Sticky'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'

import { Card } from '@lib/components'
import CardTabs from '@lib/components/CardTabs'

import InstanceTable from '../components/InstanceTable'
import HostTable from '../components/HostTable'
import DiskTable from '../components/DiskTable'
import StoreLocation from '../components/StoreLocation'
import Statistics from '../components/Statistics'

import styles from './List.module.less'

function renderTabBar(props, DefaultTabBar) {
  return (
    <Sticky stickyPosition={StickyPositionType.Header}>
      <DefaultTabBar {...props} className={styles.sticky_tabs_header} />
    </Sticky>
  )
}

export default function ListPage() {
  const { tabKey } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()

  return (
    <ScrollablePane style={{ height: '100vh' }}>
      <Card>
        <CardTabs
          defaultActiveKey={tabKey}
          onChange={(key) => {
            navigate(`/cluster_info/${key}`)
          }}
          renderTabBar={renderTabBar}
          animated={false}
        >
          <CardTabs.TabPane
            tab={t('cluster_info.list.instance_table.title')}
            key="instance"
          ></CardTabs.TabPane>
          <CardTabs.TabPane
            tab={t('cluster_info.list.host_table.title')}
            key="host"
          ></CardTabs.TabPane>
          <CardTabs.TabPane
            tab={t('cluster_info.list.disk_table.title')}
            key="disk"
          ></CardTabs.TabPane>
          <CardTabs.TabPane
            tab={t('cluster_info.list.store_topology.title')}
            key="store_topology"
          ></CardTabs.TabPane>
          <CardTabs.TabPane
            tab={t('cluster_info.list.statistics.title')}
            key="statistics"
          ></CardTabs.TabPane>
        </CardTabs>
        {tabKey === 'instance' && <InstanceTable />}
        {tabKey === 'host' && <HostTable />}
        {tabKey === 'disk' && <DiskTable />}
        {tabKey === 'store_topology' && <StoreLocation />}
        {tabKey === 'statistics' && <Statistics />}
      </Card>
    </ScrollablePane>
  )
}
