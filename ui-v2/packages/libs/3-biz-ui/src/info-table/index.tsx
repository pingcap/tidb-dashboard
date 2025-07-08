import { useTn } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { Tooltip, Typography } from "@tidbcloud/uikit"
import { MRT_ColumnDef, ProTable } from "@tidbcloud/uikit/biz"

import { I18nNamespace, updateI18nLocales } from "./locales"

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

InfoTable.i18nNamespace = I18nNamespace
InfoTable.updateI18nLocales = updateI18nLocales
