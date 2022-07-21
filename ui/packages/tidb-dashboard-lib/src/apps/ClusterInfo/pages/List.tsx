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
      <DefaultTabBar {...props} className={styles.card_tab_navs} />
    </Sticky>
  )
}

export default function ListPage() {
  const { tabKey } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const tabs = [
    {
      key: 'instance',
      title: t('cluster_info.list.instance_table.title'),
      content: () => <InstanceTable />
    },
    {
      key: 'host',
      title: t('cluster_info.list.host_table.title'),
      content: () => <HostTable />
    },
    {
      key: 'disk',
      title: t('cluster_info.list.disk_table.title'),
      content: () => <DiskTable />
    },
    {
      key: 'store_topology',
      title: t('cluster_info.list.store_topology.title'),
      content: () => <StoreLocation />
    },
    {
      key: 'statistics',
      title: t('cluster_info.list.statistics.title'),
      content: () => <Statistics />
    }
  ]

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
          tabs={tabs}
        />
      </Card>
    </ScrollablePane>
  )
}
