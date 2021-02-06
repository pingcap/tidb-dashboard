import { ColumnsTransformers, DataSource, InsightMap } from './types'
import { Prefs, SandDance } from '@msrvida/sanddance-explorer'

// @lib/client/index.tsx import antd, so to avoid import antd in this app, just copy some code from it
let apiPrefix: string

if (process.env.NODE_ENV === 'development') {
  if (process.env.REACT_APP_DASHBOARD_API_URL) {
    apiPrefix = `${process.env.REACT_APP_DASHBOARD_API_URL}/dashboard/api`
  } else {
    apiPrefix = 'http://localhost:12333/dashboard/api'
  }
} else {
  apiPrefix = '/dashboard/api'
}

const REPLICATION_DATA_ID = 'replications'
const REGION_DATA_ID = 'regions'

export const defaultDataSources: DataSource[] = [
  {
    dataSourceType: 'dashboard',
    id: REPLICATION_DATA_ID,
    displayName: 'Replications',
    dataUrl: `${apiPrefix}/topology/region?type=replications`,
    type: 'csv',
    withToken: true,
  },
  {
    dataSourceType: 'dashboard',
    id: REGION_DATA_ID,
    displayName: 'Regions',
    dataUrl: `${apiPrefix}/topology/region?type=regions`,
    type: 'csv',
    withToken: true,
  },
]

function forceIDAsText(columns: SandDance.types.Column[]) {
  for (const column of columns) {
    if (column.name.includes('id')) column.quantitative = false
  }
}

export const defaultColumnsTransformers: ColumnsTransformers = {
  [REGION_DATA_ID]: forceIDAsText,
  [REPLICATION_DATA_ID]: forceIDAsText,
}

export const insightPresets: InsightMap = {
  [REGION_DATA_ID]: {
    columns: {
      uid: 'id',
      color: 'replication_count',
      sort: 'id',
    },
    scheme: 'dual_redgreen',
    chart: 'grid',
    view: '2d',
  },
  [REPLICATION_DATA_ID]: {
    columns: {
      uid: 'id',
      x: 'store_id',
      color: 'read_keys',
      sort: 'read_keys',
    },
    scheme: 'orangered',
    chart: 'barchartV',
    view: '2d',
  },
}

export interface OptionPresets {
  [datasetId: string]: {
    chartPresets: Prefs
    tooltipExclusions?: string[]
  }
}

export const optionPresets: OptionPresets = {
  '*': {
    chartPresets: {
      '*': {
        '*': {
          '*': {
            signalValues: {
              RoleColor_BinCountSignal: 7,
            },
          },
        },
      },
    },
  },
  [REPLICATION_DATA_ID]: {
    chartPresets: {},
    tooltipExclusions: ['approximate_keys', 'approximate_size'],
  },
  [REGION_DATA_ID]: {
    chartPresets: {},
    tooltipExclusions: [
      'approximate_keys',
      'approximate_size',
      'pending_replications',
      'down_replications',
      'replications',
    ],
  },
}
