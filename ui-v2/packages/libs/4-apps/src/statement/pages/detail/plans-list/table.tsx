import { ProTable } from "@tidbcloud/uikit/biz"
import { useEffect, useMemo, useState } from "react"

import { StatementModel } from "../../../models"
import { useDetailUrlState } from "../../../shared-state/detail-url-state"
import {
  usePlanBindStatusData,
  usePlanBindSupportData,
} from "../../../utils/use-data"

import { useStatementColumns } from "./cols"

export function PlansListTable({
  data,
  detailData,
}: {
  data: StatementModel[]
  detailData: StatementModel
}) {
  const { data: planBindSupport } = usePlanBindSupportData()
  const { data: planBindStatus } = usePlanBindStatusData(
    detailData.digest!,
    detailData.summary_begin_time!,
    detailData.summary_end_time!,
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

  // combine sortedData and detailData
  // make always show detailData in the footer
  // detailData is the total value of all plans
  const finalData = useMemo(() => {
    if (sortedData && sortedData.length > 1) {
      return [...sortedData, { ...detailData, plan_digest: "all" }]
    }
    return sortedData
  }, [sortedData, detailData])

  // select first plan default
  const { plan, setPlan } = useDetailUrlState()
  useEffect(() => {
    if (!plan && sortedData && sortedData.length > 0) {
      setPlan(sortedData[0].plan_digest!)
    }
  }, [plan, setPlan, sortedData])

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
      data={finalData}
    />
  )
}
