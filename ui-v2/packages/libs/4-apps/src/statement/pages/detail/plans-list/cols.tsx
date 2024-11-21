import { MRT_ColumnDef } from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import { Checkbox } from "@pingcap-incubator/tidb-dashboard-lib-primitive-ui"
import { formatNumByUnit } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { useMemo } from "react"

import { StatementModel } from "../../../models"
import { useDetailUrlState } from "../../../url-state/detail-url-state"

function PlanCheckCell({ planDigest }: { planDigest: string }) {
  const { plans, setPlans } = useDetailUrlState()

  const handleCheckChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    planDigest: string,
  ) => {
    const checked = e.target.checked
    if (checked) {
      const newPlans = plans.filter((d) => d !== "empty").concat(planDigest)
      setPlans(newPlans)
    } else {
      const newPlans = plans.filter((d) => d !== planDigest)
      if (newPlans.length === 0) {
        newPlans.push("empty")
      }
      setPlans(newPlans)
    }
  }

  return (
    <Checkbox
      size="xs"
      checked={plans.includes(planDigest)}
      onChange={(e) => handleCheckChange(e, planDigest)}
    />
  )
}

export function useStatementColumns() {
  const columns = useMemo<MRT_ColumnDef<StatementModel>[]>(() => {
    return [
      {
        id: "check",
        header: "",
        size: 20,
        enableSorting: false,
        accessorFn: (row) => <PlanCheckCell planDigest={row.plan_digest!} />,
      },
      {
        id: "plan_digest",
        header: "Plan ID",
        enableSorting: false,
        accessorFn: (row) => row.plan_digest || "-",
      },
      {
        id: "sum_latency",
        header: "Total Latency",
        enableSorting: false,
        accessorFn: (row) => formatNumByUnit(row.sum_latency!, "ns"),
      },
      {
        id: "avg_latency",
        header: "Mean Latency",
        enableSorting: false,
        accessorFn: (row) => formatNumByUnit(row.avg_latency!, "ns"),
      },
      {
        id: "exec_count",
        header: "Executions Count",
        accessorFn: (row) => formatNumByUnit(row.exec_count!, "short"),
      },
      {
        id: "avg_mem",
        header: "Mean Memory",
        enableSorting: false,
        accessorFn: (row) => formatNumByUnit(row.avg_mem!, "bytes"),
      },
    ]
  }, [])

  return columns
}
