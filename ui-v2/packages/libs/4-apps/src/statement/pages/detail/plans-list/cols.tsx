import {
  formatNumByUnit,
  useTn,
} from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { Group, Typography } from "@tidbcloud/uikit"
import { MRT_ColumnDef } from "@tidbcloud/uikit/biz"
import { useMemo } from "react"

import { StatementModel } from "../../../models"

import { SqlPlanBindActionCell } from "./bind-sql-cell"
import { PlanCheckCell } from "./plan-check-cell"
import { SlowQueryCell } from "./slow-query-cell"

export function useStatementColumns(
  supportBindPlan: boolean,
  bindPlanDigests: string[],
) {
  const { tk } = useTn("statement")
  const columns = useMemo<MRT_ColumnDef<StatementModel>[]>(() => {
    return [
      {
        id: "check",
        header: "",
        size: 20,
        enableSorting: false,
        enableResizing: false,
        accessorFn: (row) => <PlanCheckCell planDigest={row.plan_digest!} />,
      },
      {
        id: "plan_digest",
        header: tk("fields.plan_digest"),
        enableSorting: false,
        minSize: 100,
        accessorFn: (row) => (
          <Typography
            truncate
            fw={row.plan_digest === "all" ? "bold" : "normal"}
          >
            {row.plan_digest || "-"}
          </Typography>
        ),
      },
      {
        id: "sum_latency",
        header: tk("fields.sum_latency"),
        enableResizing: false,
        accessorFn: (row) => (
          <Typography
            truncate
            fw={row.plan_digest === "all" ? "bold" : "normal"}
          >
            {formatNumByUnit(row.sum_latency!, "ns")}
          </Typography>
        ),
      },
      {
        id: "avg_latency",
        header: tk("fields.avg_latency"),
        enableResizing: false,
        accessorFn: (row) => (
          <Typography
            truncate
            fw={row.plan_digest === "all" ? "bold" : "normal"}
          >
            {formatNumByUnit(row.avg_latency!, "ns")}
          </Typography>
        ),
      },
      {
        id: "exec_count",
        header: tk("fields.exec_count"),
        enableResizing: false,
        accessorFn: (row) => (
          <Typography
            truncate
            fw={row.plan_digest === "all" ? "bold" : "normal"}
          >
            {formatNumByUnit(row.exec_count!, "short")}
          </Typography>
        ),
      },
      {
        id: "avg_mem",
        header: tk("fields.avg_mem"),
        enableResizing: false,
        accessorFn: (row) => (
          <Typography
            truncate
            fw={row.plan_digest === "all" ? "bold" : "normal"}
          >
            {formatNumByUnit(row.avg_mem!, "bytes")}
          </Typography>
        ),
      },
      {
        id: "action",
        header: "",
        size: 180,
        enableSorting: false,
        enableResizing: false,
        mantineTableHeadCellProps: {
          align: "right",
        },
        mantineTableBodyCellProps: {
          align: "right",
        },
        Cell: ({ row }) => (
          <Group gap="xs">
            <SqlPlanBindActionCell
              isSupport={supportBindPlan}
              canBind={row.original.plan_can_be_bound!}
              sqlDigest={row.original.digest!}
              bindPlanDigests={bindPlanDigests}
              curPlanDigest={row.original.plan_digest!}
            />
            <SlowQueryCell planDigest={row.original.plan_digest!} />
          </Group>
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
  }, [supportBindPlan, bindPlanDigests, tk])

  return columns
}
