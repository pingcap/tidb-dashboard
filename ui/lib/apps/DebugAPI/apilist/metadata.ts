export interface MetadataGroup {
  name: string
  children: Metadata[]
}

export interface Metadata {
  name: string
  schema: string | string[]
  tags?: string[]
  query?: Map<string, { default: string }>
}

const tidb: MetadataGroup = {
  name: 'TiDB',
  children: [
    {
      name: 'Stats Dump',
      schema: 'http://{TiDBIP}:10080/stats/dump/{db}/{table}',
    },
    {
      name: 'Config',
      schema: 'http://{TiDBIP}:10080/settings',
    },
    {
      name: 'Schema',
      schema: [
        'http://{TiDBIP}:10080/schema',
        'http://{TiDBIP}:10080/schema/{db}/{table}',
      ],
      tags: ['schema'],
    },
    {
      name: 'Schema Table ID',
      schema: 'http://{TiDBIP}:10080/db-table/{tableID}',
      tags: ['schema'],
    },
  ],
}

const tikv: MetadataGroup = {
  name: 'TiKV',
  children: [],
}

const metadataGroups: MetadataGroup[] = [tidb, tikv]

export default metadataGroups
