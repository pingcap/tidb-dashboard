import {
  addLangsLocales,
  useTn,
} from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { Tooltip, Typography } from "@tidbcloud/uikit"
import { MRT_ColumnDef, ProTable } from "@tidbcloud/uikit/biz"

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

//------------------------
// i18n
// auto updated by running `pnpm gen:locales`

const I18nNamespace = "info-table"

type I18nLocaleKeys = "Description" | "Name" | "Value"
type I18nLocale = {
  [K in I18nLocaleKeys]?: string
}
const en: I18nLocale = {}
const zh: I18nLocale = {
  Description: "描述",
  Name: "名称",
  Value: "值",
}

function updateI18nLocales(locales: { [ln: string]: I18nLocale }) {
  for (const [ln, locale] of Object.entries(locales)) {
    addLangsLocales({
      [ln]: {
        __namespace__: I18nNamespace,
        ...locale,
      },
    })
  }
}

updateI18nLocales({ en, zh })

InfoTable.i18nNamespace = I18nNamespace
InfoTable.updateI18nLocales = updateI18nLocales
