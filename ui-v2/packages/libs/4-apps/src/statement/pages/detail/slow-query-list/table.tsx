import { MRT_SortingState, ProTable } from "@tidbcloud/uikit/biz"
import { useState } from "react"

import { useSlowQueryListData } from "../../../utils/use-data"

import { useListTableColumns } from "./cols"

export function ListTable() {
  const cols = useListTableColumns()
  const [sorting, setSorting] = useState<MRT_SortingState>([
    { id: "timestamp", desc: true },
  ])
  const { data, isLoading } = useSlowQueryListData(
    sorting[0]?.id ?? "",
    sorting[0]?.desc ?? true,
  )

  return (
    <ProTable
      layoutMode="grid"
      enableColumnResizing
      enableColumnPinning
      enableSorting
      manualSorting
      sortDescFirst
      state={{ isLoading, sorting }}
      onSortingChange={setSorting}
      initialState={{ columnPinning: { left: ["query"] } }}
      columns={cols}
      data={data ?? []}
    />
  )
}
