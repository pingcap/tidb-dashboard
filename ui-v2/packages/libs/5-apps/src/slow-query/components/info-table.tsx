import {
  MRT_ColumnDef,
  ProTable,
} from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import {
  Tooltip,
  Typography,
} from "@pingcap-incubator/tidb-dashboard-lib-primitive-ui"

export type InfoModel = {
  name: string
  level?: number
  value: string
  description?: string
}

const columns: MRT_ColumnDef<InfoModel>[] = [
  {
    id: "name",
    header: "Name",
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
    header: "Value",
    accessorFn: (row) => (
      <Tooltip label={row.value} position="top-start" withArrow>
        <Typography truncate>{row.value}</Typography>
      </Tooltip>
    ),
  },
  {
    id: "desc",
    header: "Description",
    accessorFn: (row) => (
      <Tooltip
        multiline
        maw={600}
        label={row.description}
        position="top-start"
        withArrow
      >
        <Typography maw={800} truncate>
          {row.description}
        </Typography>
      </Tooltip>
    ),
  },
]

export function InfoTable({ data }: { data: InfoModel[] }) {
  return <ProTable columns={columns} data={data} />
}
