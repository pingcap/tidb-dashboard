import { ProTable } from "@tidbcloud/uikit/biz"

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

  return (
    <ProTable
      enableSorting
      state={{
        sorting: [{ id: "exec_count", desc: true }],
        columnVisibility: {
          check: data.length > 1,
          action: !!planBindSupport && !!planBindStatus,
        },
      }}
      columns={columns}
      data={data}
    />
  )
}
