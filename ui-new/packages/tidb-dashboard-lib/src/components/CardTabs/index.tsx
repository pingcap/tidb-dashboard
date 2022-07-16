import React, { useState } from 'react'
import { Tabs } from 'antd'
import cx from 'classnames'
import styles from './index.module.less'
import { TabsProps } from 'antd/es/tabs'

type Tab = {
  key: string
  title: string
  content: () => React.ReactNode
}

export interface ICardTabsProps extends TabsProps {
  className?: string
  tabs: Tab[]
}

function renderCardTabBar(props, DefaultTabBar) {
  return <DefaultTabBar {...props} className={styles.card_tab_navs} />
}

function CardTabs({
  className,
  tabs,
  defaultActiveKey,
  onChange,
  renderTabBar,
  ...restProps
}: ICardTabsProps) {
  const [tabKey, setTabKey] = useState(defaultActiveKey || tabs[0].key)
  const c = cx(styles.tabs, className)
  const selectedTab = tabs.find((tab) => tab.key === tabKey)

  function changeTab(tabKey) {
    setTabKey(tabKey)
    onChange && onChange(tabKey)
  }

  return (
    <>
      <Tabs
        className={c}
        defaultActiveKey={tabKey}
        onChange={changeTab}
        renderTabBar={renderTabBar || renderCardTabBar}
        {...restProps}
        data-e2e="tabs"
      >
        {tabs.map((tab) => (
          <Tabs.TabPane tab={tab.title} key={tab.key} />
        ))}
      </Tabs>
      {selectedTab?.content()}
    </>
  )
}

export default CardTabs
