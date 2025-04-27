import { Tooltip, Typography } from "@tidbcloud/uikit"
import { MRT_ColumnDef, ProTable } from "@tidbcloud/uikit/biz"
import { useMemo } from "react"

import { PlanItem, getPlanTextType, parsePlanTextToArray } from "./parser"

const columns: MRT_ColumnDef<PlanItem>[] = [
  {
    id: "id",
    header: "id",
    accessorFn: (row) => (
      <Tooltip withinPortal label={row.id}>
        <Typography truncate ff="monospace" sx={{ whiteSpace: "pre" }}>
          {row.id}
        </Typography>
      </Tooltip>
    ),
  },
  {
    id: "estRows",
    header: "estRows",
    size: 120,
    enableResizing: false,
    accessorFn: (row) => row.estRows,
  },
  {
    id: "estCost",
    header: "estCost",
    size: 120,
    enableResizing: false,
    accessorFn: (row) => row.estCost,
  },
  {
    id: "actRows",
    header: "actRows",
    size: 120,
    enableResizing: false,
    accessorFn: (row) => row.actRows,
  },
  {
    id: "task",
    header: "task",
    size: 100,
    enableResizing: false,
    accessorFn: (row) => row.task,
  },
  {
    id: "accessObject",
    header: "access object",
    size: 120,
    accessorFn: (row) => (
      <Tooltip
        withinPortal
        multiline
        maw={400}
        label={row.accessObject}
        style={{ wordBreak: "break-all" }}
      >
        <Typography maw={200} truncate>
          {row.accessObject}
        </Typography>
      </Tooltip>
    ),
  },
  {
    id: "executionInfo",
    header: "execution info",
    enableResizing: false,
    accessorFn: (row) => (
      <Tooltip
        withinPortal
        multiline
        maw={400}
        label={row.executionInfo}
        style={{ wordBreak: "break-all" }}
      >
        <Typography maw={200} truncate>
          {row.executionInfo}
        </Typography>
      </Tooltip>
    ),
  },
  {
    id: "operatorInfo",
    header: "operator info",
    enableResizing: false,
    accessorFn: (row) => {
      // truncate the string if it's too long
      // operation info may be super super long
      const truncateLength = 100
      let truncatedStr = row.operatorInfo ?? ""
      if (truncatedStr.length > truncateLength) {
        truncatedStr = row.operatorInfo.slice(0, truncateLength) + "..."
      }
      const truncateTooltipLen = 2000
      let truncatedTooltipStr = row.operatorInfo ?? ""
      if (truncatedTooltipStr.length > truncateTooltipLen) {
        truncatedTooltipStr =
          row.operatorInfo.slice(0, truncateTooltipLen) +
          "...(too long to show, copy or download to analyze)"
      }
      return (
        <Tooltip
          withinPortal
          multiline
          maw={400}
          label={truncatedTooltipStr}
          style={{ wordBreak: "break-all" }}
        >
          <Typography maw={200} truncate>
            {truncatedStr}
          </Typography>
        </Tooltip>
      )
    },
  },
  {
    id: "memory",
    header: "memory",
    size: 100,
    enableResizing: false,
    accessorFn: (row) => row.memory,
  },
  {
    id: "disk",
    header: "disk",
    size: 100,
    enableResizing: false,
    accessorFn: (row) => row.disk,
  },
]

export function PlanTable({ plan }: { plan: string }) {
  const planType = getPlanTextType(plan)
  const planItems = useMemo(() => parsePlanTextToArray(plan), [plan])

  return (
    <ProTable
      data={planItems}
      columns={columns}
      layoutMode="grid"
      enableColumnResizing
      enableColumnPinning
      initialState={{
        columnVisibility: {
          estCost: planType === "v2",
          accessObject: planType === "v2",
        },
        columnPinning: { left: ["id"] },
      }}
    />
  )
}
