import { Tooltip, Typography } from "@tidbcloud/uikit"
import { MRT_ColumnDef, ProTable } from "@tidbcloud/uikit/biz"

export type InfoModel = {
  name: string
  level?: number
  value: string
  desc?: string
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
    accessorFn: (row) => <Typography truncate>{row.value}</Typography>,
  },
  {
    id: "desc",
    header: "Description",
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

export function InfoTable({ data }: { data: InfoModel[] }) {
  return <ProTable columns={columns} data={data} />
}
