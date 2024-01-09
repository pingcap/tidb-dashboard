import React, { useMemo } from 'react'
import { Select } from 'antd'

import { TopsqlInstanceItem } from '@lib/client'

import commonStyles from './common.module.less'

interface InstanceGroup {
  name: string
  instances: TopsqlInstanceItem[]
}

export interface InstanceSelectProps {
  value: TopsqlInstanceItem | null
  onChange: (instance: TopsqlInstanceItem) => void
  instances: TopsqlInstanceItem[]
  disabled?: boolean
  onDropdownVisibleChange?: (visible: boolean) => void
}

const splitter = ' - '

const combineSelectValue = (item: TopsqlInstanceItem | null) => {
  if (!item) {
    return ''
  }
  return `${item.instance_type}${splitter}${item.instance}`
}

const splitSelectValue = (v: string): TopsqlInstanceItem => {
  const [instance_type, instance] = v.split(splitter)
  return { instance, instance_type }
}

export function InstanceSelect({
  value,
  onChange,
  instances,
  disabled = false,
  ...otherProps
}: InstanceSelectProps) {
  const instanceGroups: InstanceGroup[] = useMemo(() => {
    if (!instances) {
      return []
    }

    // Depend on the ordered instances
    return instances.reduce((prev, instance) => {
      const lastGroup = prev[prev.length - 1]
      if (!lastGroup || lastGroup.name !== instance.instance_type) {
        prev.push({ name: instance.instance_type!, instances: [instance] })
        return prev
      }

      lastGroup.instances.push(instance)
      return prev
    }, [] as InstanceGroup[])
  }, [instances])

  return (
    <Select
      style={{ minWidth: 200 }}
      placeholder="Select Instance"
      value={combineSelectValue(value)}
      onChange={(value) => {
        const instance = splitSelectValue(value)
        onChange(instance)
      }}
      disabled={disabled}
      data-e2e="instance-selector"
      {...otherProps}
    >
      {instanceGroups.map((instanceGroup) => (
        <Select.OptGroup label={instanceGroup.name} key={instanceGroup.name}>
          {instanceGroup.instances.map((item) => (
            <Select.Option
              className={commonStyles.select_option}
              value={combineSelectValue(item)}
              key={item.instance}
            >
              <span className={commonStyles.hide}>{instanceGroup.name} - </span>
              {item.instance}
            </Select.Option>
          ))}
        </Select.OptGroup>
      ))}
    </Select>
  )
}
