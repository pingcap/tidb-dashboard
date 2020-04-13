import { Tabs } from 'antd'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { HashRouter as Router, Route, Routes } from 'react-router-dom'
import HostTable from '../components/HostTable'
import InstanceTable from '../components/InstanceTable'

const { TabPane } = Tabs

export default function ListPage() {
  const { t } = useTranslation()

  return (
    <Router>
      <Routes>
        <Route
          path="/cluster_info/:tab"
          render={({ match, history }) => {
            return (
              <Tabs
                defaultActiveKey={match.params.tab}
                onChange={(key) => {
                  history.push(`/${key}`)
                }}
                tabBarStyle={{ margin: 48, marginBottom: 0 }}
              >
                <TabPane
                  tab={t('cluster_info.list.instance_table.title')}
                  key="1"
                >
                  <InstanceTable />
                </TabPane>
                <TabPane tab={t('cluster_info.list.host_table.title')} key="2">
                  <HostTable />
                </TabPane>
              </Tabs>
            )
          }}
        />
      </Routes>
    </Router>
  )
}
