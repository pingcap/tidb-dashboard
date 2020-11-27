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

function CardTabs({
  className,
  tabs,
  defaultActiveKey,
  onChange,
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
        {...restProps}
        defaultActiveKey={tabKey}
        onChange={changeTab}
      >
        {tabs.map((tab) => (
          <Tabs.TabPane tab={tab.title} key={tab.key}></Tabs.TabPane>
        ))}
      </Tabs>
      {selectedTab?.content()}
    </>
  )
}

export default CardTabs
