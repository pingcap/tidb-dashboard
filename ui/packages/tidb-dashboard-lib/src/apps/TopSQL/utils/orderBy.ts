import type { ITopSQLConfig } from '../context'
import type { TopSQLOrderBy } from './response'

const DETAILED_IO_ORDER_BY: TopSQLOrderBy[] = [
  'logical_read',
  'logical_write',
  'rocksdb_block_read'
]

// Add detailed TiKV dimensions without granting new CPU / Network permissions.
export function resolveTopSQLOrderByConfig(
  cfg:
    | Pick<
        ITopSQLConfig,
        'showOrderBy' | 'allowedOrderBy' | 'showDetailedIoDimensions'
      >
    | null
    | undefined,
  instanceType?: string
) {
  const showOrderBy = cfg?.showOrderBy === true
  const allowedOrderBy = cfg?.allowedOrderBy
  if (instanceType !== 'tikv' || cfg?.showDetailedIoDimensions !== true) {
    return { showOrderBy, allowedOrderBy }
  }

  const baseAllowedOrderBy: TopSQLOrderBy[] | undefined = showOrderBy
    ? allowedOrderBy
    : ['cpu']
  return {
    showOrderBy: true,
    allowedOrderBy: baseAllowedOrderBy
      ? [...new Set([...baseAllowedOrderBy, ...DETAILED_IO_ORDER_BY])]
      : undefined
  }
}
