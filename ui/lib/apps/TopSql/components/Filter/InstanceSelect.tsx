import React, { useEffect, useMemo } from 'react'
import { useQuery } from 'react-query'
import { Select } from 'antd'

import client, { TopsqlInstanceItem } from '@lib/client'

interface InstanceGroup {
  name: string
  instances: TopsqlInstanceItem[]
}

export interface InstanceSelectProps {
  value: InstanceId
  onChange: (id: string) => void
}

export type InstanceId = string | undefined

export function InstanceSelect({ value, onChange }: InstanceSelectProps) {
  const { data, isLoading } = useQuery('getInstances', () =>
    client.getInstance().topsqlInstancesGet()
  )
  const instances = data?.data.data
  const instanceGroups: InstanceGroup[] = useMemo(() => {
    if (!instances) {
      return []
    }

    instances.sort((a, b) => {
      const localCompare = a.instance_type!.localeCompare(b.instance_type!)
      if (localCompare === 0) {
        return a.instance!.localeCompare(b.instance!)
      }
      return localCompare
    })

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

  useEffect(() => {
    if (!instanceGroups.length) {
      return
    }
    const firstItem = instanceGroups[0].instances[0]
    const notExist = !instances!.find((inst) => inst.instance === value)
    // set first instance as default, or reset instance id if previous instance isn't in current timestamp range
    if (!value || notExist) {
      onChange(firstItem.instance!)
    }
    // eslint-disable-next-line
  }, [instanceGroups])

  return (
    <Select
      style={{ width: 180 }}
      placeholder="Select Instance"
      value={value}
      onChange={onChange}
      loading={isLoading}
    >
      {instanceGroups.map((instanceGroup) => (
        <Select.OptGroup label={instanceGroup.name} key={instanceGroup.name}>
          {instanceGroup.instances.map((item) => (
            <Select.Option value={item.instance!} key={item.instance}>
              {item.instance}
            </Select.Option>
          ))}
        </Select.OptGroup>
      ))}
    </Select>
  )
}
