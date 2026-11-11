import React, { useMemo } from 'react'
import { Select } from 'antd'
import { useTranslation } from 'react-i18next'

import { TopsqlInstanceItem } from '@lib/client'
import { AGGREGATE_INSTANCE } from '../../utils/instances'

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

export const isAggregateInstance = (item: TopsqlInstanceItem | null) =>
  !!item && item.instance === AGGREGATE_INSTANCE

const INSTANCE_TYPE_LABELS: Record<string, string> = {
  tidb: 'TiDB',
  tikv: 'TiKV'
}

const instanceTypeLabel = (instanceType?: string) =>
  (instanceType && INSTANCE_TYPE_LABELS[instanceType]) ||
  instanceType?.toUpperCase()

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
  const { t } = useTranslation()
  const instanceGroups: InstanceGroup[] = useMemo(() => {
    if (!instances) {
      return []
    }

    // Depend on the ordered instances
    const groups = instances.reduce((prev, instance) => {
      const lastGroup = prev[prev.length - 1]
      if (!lastGroup || lastGroup.name !== instance.instance_type) {
        prev.push({ name: instance.instance_type!, instances: [instance] })
        return prev
      }

      lastGroup.instances.push(instance)
      return prev
    }, [] as InstanceGroup[])

    // Pin the "all instances" pseudo instance to the top of its group.
    return groups.map((g) => ({
      ...g,
      instances: [
        ...g.instances.filter(isAggregateInstance),
        ...g.instances.filter((i) => !isAggregateInstance(i))
      ]
    }))
  }, [instances])

  const displayName = (item: TopsqlInstanceItem) =>
    isAggregateInstance(item)
      ? t('topsql.instance_select.all_instances', {
          type: instanceTypeLabel(item.instance_type)
        })
      : item.instance

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
              key={combineSelectValue(item)}
            >
              <span className={commonStyles.hide}>{instanceGroup.name} - </span>
              {displayName(item)}
            </Select.Option>
          ))}
        </Select.OptGroup>
      ))}
    </Select>
  )
}
