import {
  addLangsLocales,
  useTn,
} from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { Tooltip, Typography } from "@tidbcloud/uikit"
import { MRT_ColumnDef, ProTable } from "@tidbcloud/uikit/biz"

addLangsLocales({
  zh: {
    __namespace__: "info-table",
    Name: "名称",
    Value: "值",
    Description: "描述",
  },
})

export type InfoModel = {
  name: string
  level?: number
  value: string
  desc?: string
}

export function InfoTable({ data }: { data: InfoModel[] }) {
  const { tt } = useTn("info-table")
  const columns: MRT_ColumnDef<InfoModel>[] = [
    {
      id: "name",
      header: tt("Name"),
      accessorFn: (row) => (
        <Typography
          truncate
          fw={row.level === 0 ? "bold" : undefined}
          pl={row.level && row.level * 24}
        >
          {row.name}
        </Typography>
      ),
    },
    {
      id: "value",
      header: tt("Value"),
      accessorFn: (row) => <Typography truncate>{row.value}</Typography>,
    },
    {
      id: "desc",
      header: tt("Description"),
      accessorFn: (row) => (
        <Tooltip
          multiline
          maw={600}
          label={row.desc}
          position="top-start"
          withArrow
        >
          <Typography maw={800} truncate>
            {row.desc}
          </Typography>
        </Tooltip>
      ),
    },
  ]
  return <ProTable columns={columns} data={data} />
}
