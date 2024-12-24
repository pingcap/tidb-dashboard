import { ProTable } from "@tidbcloud/uikit/biz"
import { useMemo, useState } from "react"

import { StatementModel } from "../../../models"
import {
  usePlanBindStatusData,
  usePlanBindSupportData,
} from "../../../utils/use-data"

import { useStatementColumns } from "./cols"

export function PlansListTable({ data }: { data: StatementModel[] }) {
  const stmt = data[0]
  const { data: planBindSupport } = usePlanBindSupportData()
  const { data: planBindStatus } = usePlanBindStatusData(
    stmt.digest!,
    stmt.summary_begin_time!,
    stmt.summary_end_time!,
  )
  const columns = useStatementColumns(
    planBindSupport?.is_support ?? false,
    planBindStatus ?? [],
  )
  const [sorting, setSorting] = useState([{ id: "exec_count", desc: true }])

  // do sorting in local
  const sortedData = useMemo(() => {
    if (!data) {
      return []
    }
    if (!sorting[0]) {
      return data
    }
    const [{ id, desc }] = sorting
    const sorted = [...data]
    sorted.sort((a, b) => {
      const aVal = a[id as keyof StatementModel] ?? 0
      const bVal = b[id as keyof StatementModel] ?? 0
      if (desc) {
        return Number(aVal) > Number(bVal) ? -1 : 1
      } else {
        return Number(aVal) > Number(bVal) ? 1 : -1
      }
    })
    return sorted
  }, [data, sorting])

  return (
    <ProTable
      layoutMode="grid"
      enableColumnResizing
      enableColumnPinning
      enableSorting
      manualSorting
      sortDescFirst
      onSortingChange={setSorting}
      initialState={{
        columnPinning: { left: ["check", "plan_digest"], right: ["action"] },
      }}
      state={{
        sorting,
        columnVisibility: {
          check: data.length > 1,
          action: !!planBindSupport && !!planBindStatus,
        },
      }}
      columns={columns}
      data={sortedData}
    />
  )
}
