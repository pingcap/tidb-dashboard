import {
  formatNumByUnit,
  formatTime,
} from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { Tooltip, Typography } from "@tidbcloud/uikit"
import { MRT_ColumnDef, MRT_RowData } from "@tidbcloud/uikit/biz"

export class ColConfig<T extends MRT_RowData> {
  constructor(private col: MRT_ColumnDef<T>) {}

  getConfig(): MRT_ColumnDef<T> {
    return this.col
  }
  setConfig(config: MRT_ColumnDef<T>) {
    this.col = config
    return this
  }
  patchConfig(config: Partial<MRT_ColumnDef<T>>) {
    this.col = { ...this.col, ...config }
    return this
  }
}

export class TableColsFactory<T extends MRT_RowData> {
  constructor(private tk: (key: string) => string) {}

  columns(colConfigs: ColConfig<T>[]): MRT_ColumnDef<T>[] {
    return colConfigs.map((c) => c.getConfig())
  }

  defCol(filedName: keyof T): ColConfig<T> {
    return new ColConfig({
      id: String(filedName),
      header: this.tk(`fields.${String(filedName)}`),
      enableSorting: true,
      enableResizing: false,
      accessorFn: (row) => row[filedName],
    })
  }

  number(filedName: keyof T, unit: string): ColConfig<T> {
    return this.defCol(filedName).patchConfig({
      accessorFn: (row) => formatNumByUnit(row[filedName]!, unit) || "-",
    })
  }

  timestamp(filedName: keyof T): ColConfig<T> {
    return this.defCol(filedName).patchConfig({
      accessorFn: (row) => formatTime(row[filedName]! * 1000),
    })
  }

  text(filedName: keyof T): ColConfig<T> {
    return this.defCol(filedName).patchConfig({
      enableSorting: false,
      enableResizing: true,
      accessorFn: (row) => (
        <Typography truncate>{row[filedName] || "-"}</Typography>
      ),
    })
  }

  textWithTooltip(filedName: keyof T): ColConfig<T> {
    return this.defCol(filedName).patchConfig({
      enableSorting: false,
      enableResizing: true,
      accessorFn: (row) => (
        <Tooltip label={row[filedName] || ""}>
          <Typography truncate>{row[filedName] || "-"}</Typography>
        </Tooltip>
      ),
    })
  }
}
