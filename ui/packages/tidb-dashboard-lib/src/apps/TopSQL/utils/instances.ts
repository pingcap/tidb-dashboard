import type { TopsqlInstanceItem } from '@lib/client'

export interface TopSQLInstanceOptions {
  allowedInstanceTypes?: Array<'tidb' | 'tikv'>
  requireListedInstance?: boolean
}

// A stale catalog must neither change the selected instance nor stop the spinner.
export function createLatestTopSQLInstanceRequest() {
  let sequence = 0
  return async function <T>(
    request: () => Promise<T>,
    onResponse: (data: T) => void,
    onSettled: () => void
  ): Promise<T | null> {
    const requestId = ++sequence
    try {
      const data = await request()
      if (requestId !== sequence) return null
      onResponse(data)
      return data
    } finally {
      if (requestId === sequence) onSettled()
    }
  }
}

export function isTopSQLInstanceAllowed(
  instance: TopsqlInstanceItem,
  options: TopSQLInstanceOptions
) {
  return (
    !options.allowedInstanceTypes ||
    options.allowedInstanceTypes.some((type) => type === instance.instance_type)
  )
}

export function resolveTopSQLInstance(
  instances: TopsqlInstanceItem[],
  instanceName: string,
  instanceType: string,
  storedInstance: TopsqlInstanceItem | null | undefined,
  options: TopSQLInstanceOptions = {}
) {
  const candidates = instances.filter((item) =>
    isTopSQLInstanceAllowed(item, options)
  )
  const findInstance = (name?: string, type?: string) =>
    name
      ? candidates.find(
          (item) =>
            item.instance === name && (!type || item.instance_type === type)
        )
      : undefined
  const fromUrl = findInstance(instanceName, instanceType)
  if (fromUrl) return fromUrl
  const requestedInstance = {
    instance: instanceName,
    instance_type: instanceType
  }
  if (
    !options.requireListedInstance &&
    instanceName &&
    instanceType &&
    isTopSQLInstanceAllowed(requestedInstance, options)
  ) {
    return requestedInstance
  }
  const fromStorage = findInstance(
    storedInstance?.instance,
    storedInstance?.instance_type
  )
  if (fromStorage) return fromStorage
  if (
    !options.requireListedInstance &&
    storedInstance &&
    isTopSQLInstanceAllowed(storedInstance, options)
  ) {
    return storedInstance
  }
  return candidates[0] || null
}
