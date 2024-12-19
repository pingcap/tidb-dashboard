import { formatNumByUnit } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import {
  Button,
  Checkbox,
  Code,
  Tooltip,
  Typography,
  notifier,
  openConfirmModal,
} from "@tidbcloud/uikit"
import { MRT_ColumnDef } from "@tidbcloud/uikit/biz"
import { useMemo } from "react"

import { StatementModel } from "../../../models"
import { useDetailUrlState } from "../../../url-state/detail-url-state"
import {
  useCreatePlanBindData,
  useDeletePlanBindData,
} from "../../../utils/use-data"

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

function SqlPlanBindActionCell({
  isSupport,
  canBind,
  sqlDigest,
  bindPlanDigest,
  curPlanDigest,
}: {
  isSupport: boolean
  canBind: boolean
  sqlDigest: string
  bindPlanDigest: string
  curPlanDigest: string
}) {
  const createBindPlanMut = useCreatePlanBindData(sqlDigest, curPlanDigest)
  const deleteBindPlanMut = useDeletePlanBindData(sqlDigest)

  async function bindPlan() {
    try {
      await createBindPlanMut.mutateAsync()
      notifier.success(`Bind plan ${curPlanDigest} successfully!`)
    } catch (e) {
      notifier.error(
        `Bind plan ${curPlanDigest} failed, reason: ${e instanceof Error ? e.message : String(e)}`,
      )
    }
  }

  async function unbindPlan() {
    try {
      await deleteBindPlanMut.mutateAsync()
      notifier.success(`Unbind plan ${curPlanDigest} successfully!`)
    } catch (e) {
      notifier.error(
        `Unbind plan ${curPlanDigest} failed, reason: ${e instanceof Error ? e.message : String(e)}`,
      )
    }
  }

  function confirmBindPlan() {
    openConfirmModal({
      title: "Bind Plan",
      children: (
        <Typography>
          Are you sure to bind plan{" "}
          <Code>{curPlanDigest.slice(0, 8) + "..."}</Code> ?
        </Typography>
      ),
      labels: { confirm: "Bind", cancel: "Cancel" },
      onConfirm: bindPlan,
    })
  }

  function confirmUnbindPlan() {
    openConfirmModal({
      title: "Unbind Plan",
      children: (
        <Typography>
          Are you sure to unbind plan{" "}
          <Code>{curPlanDigest.slice(0, 8) + "..."}</Code> ?
        </Typography>
      ),
      labels: { confirm: "Unbind", cancel: "Cancel" },
      onConfirm: unbindPlan,
    })
  }

  if (!isSupport) {
    return (
      <Tooltip label="Bind plan is not supported in this version">
        <Button data-disabled onClick={(event) => event.preventDefault()}>
          Bind
        </Button>
      </Tooltip>
    )
  }
  if (!canBind) {
    return (
      <Tooltip label="This plan can not be bound">
        <Button data-disabled onClick={(event) => event.preventDefault()}>
          Bind
        </Button>
      </Tooltip>
    )
  }
  if (bindPlanDigest) {
    if (curPlanDigest === bindPlanDigest) {
      return (
        <Button variant="transparent" c="red" onClick={confirmUnbindPlan}>
          Unbind
        </Button>
      )
    }
    return <div></div>
  }
  return (
    <Button variant="transparent" c="peacock" onClick={confirmBindPlan}>
      Bind
    </Button>
  )
}

export function useStatementColumns(
  supportBindPlan: boolean,
  bindPlanDigest: string,
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
            bindPlanDigest={bindPlanDigest}
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
  }, [supportBindPlan, bindPlanDigest])

  return columns
}
