import React from 'react'
import { Descriptions as AntDescriptions } from 'antd'
import type { DescriptionsItemProps } from 'antd/es/descriptions/Item'
import cx from 'classnames'

import styles from './index.module.less'

export interface IDescriptionsProps {
  className?: string
  children?:
    | (React.ReactElement<IDescriptionsItemProps> | null | undefined)[]
    | React.ReactElement<IDescriptionsItemProps>
  column?: number
  onClick?: () => void
}

export interface IDescriptionsItemProps extends DescriptionsItemProps {
  className?: string
  children: React.ReactNode
  multiline?: boolean
  onClick?: () => void
}

// FIXME: This logic duplicates to <TextWrap>
function mapItem(item: React.ReactElement<IDescriptionsItemProps>) {
  const { props } = item
  const { multiline, className, children, ...restProps } = props
  const c = cx(className, styles.item, {
    [styles.itemMultiline]: multiline,
    [styles.itemSingleline]: !multiline
  })
  return (
    <AntDescriptions.Item className={c} key={item.key || ''} {...restProps}>
      {children}
    </AntDescriptions.Item>
  )
}

function Descriptions({
  className,
  children,
  column,
  ...restProps
}: IDescriptionsProps) {
  const c = cx(className, styles.descriptions)
  let realChildren
  if (children) {
    if (Array.isArray(children)) {
      realChildren = children.filter((v) => v != null).map((v) => mapItem(v!))
    } else {
      realChildren = mapItem(children)
    }
  }
  return (
    <AntDescriptions
      layout="vertical"
      colon={false}
      className={c}
      column={column ?? 2}
      {...restProps}
    >
      {realChildren}
    </AntDescriptions>
  )
}

Descriptions.Item = AntDescriptions.Item as React.FC<IDescriptionsItemProps>

export default Descriptions
