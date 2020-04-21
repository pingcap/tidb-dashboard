import React from 'react'
import { Tabs } from 'antd'
import cx from 'classnames'
import styles from './index.module.less'
import { TabsProps } from 'antd/es/tabs'

export interface ICardTabsProps extends TabsProps {
  className?: string
  children?: React.ReactNode
}

function CardTabs({ className, children, ...restProps }: ICardTabsProps) {
  const c = cx(styles.tabs, className)
  return (
    <Tabs className={c} {...restProps}>
      {children}
    </Tabs>
  )
}

CardTabs.TabPane = Tabs.TabPane

export default CardTabs
