import { formatNumByUnit } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { MRT_ColumnDef } from "@tidbcloud/uikit/biz"
import { useMemo } from "react"

import { StatementModel } from "../../../models"

import { SqlPlanBindActionCell } from "./bind-sql-cell"
import { PlanCheckCell } from "./plan-check-cell"

export function useStatementColumns(
  supportBindPlan: boolean,
  bindPlanDigests: string[],
) {
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
      {
        id: "action",
        header: "Action",
        enableSorting: false,
        Cell: ({ row }) => (
          <SqlPlanBindActionCell
            isSupport={supportBindPlan}
            canBind={row.original.plan_can_be_bound!}
            sqlDigest={row.original.digest!}
            bindPlanDigests={bindPlanDigests}
            curPlanDigest={row.original.plan_digest!}
          />
        ),
        // here accessorFn doesn't work as expected
        // need to use Cell
        // accessorFn: (row) => <SqlPlanBindActionCell
        //   isSupport={supportBindPlan}
        //   canBind={row.plan_can_be_bound!}
        //   sqlDigest={row.digest!}
        //   bindPlanDigest={bindPlanDigest}
        //   curPlanDigest={row.plan_digest!}
        // />
      },
    ]
  }, [supportBindPlan, bindPlanDigests])

  return columns
}
