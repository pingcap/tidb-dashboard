import {
  Button,
  Code,
  Tooltip,
  Typography,
  notifier,
  openConfirmModal,
} from "@tidbcloud/uikit"

import {
  useCreatePlanBindData,
  useDeletePlanBindData,
} from "../../../utils/use-data"

export function SqlPlanBindActionCell({
  isSupport,
  canBind,
  sqlDigest,
  bindPlanDigests,
  curPlanDigest,
}: {
  isSupport: boolean
  canBind: boolean
  sqlDigest: string
  bindPlanDigests: string[]
  curPlanDigest: string
}) {
  const createBindPlanMut = useCreatePlanBindData(sqlDigest, curPlanDigest)
  const deleteBindPlanMut = useDeletePlanBindData(sqlDigest)

  async function bindPlan() {
    try {
      await createBindPlanMut.mutateAsync()
      notifier.success(
        `Bind plan ${curPlanDigest.slice(0, 8)}... successfully!`,
      )
    } catch (e) {
      notifier.error(
        `Bind plan ${curPlanDigest.slice(0, 8)}... failed, reason: ${e instanceof Error ? e.message : String(e)}`,
      )
    }
  }

  async function unbindPlan() {
    try {
      await deleteBindPlanMut.mutateAsync()
      notifier.success(`Unbind plans successfully!`)
    } catch (e) {
      notifier.error(
        `Unbind plans failed, reason: ${e instanceof Error ? e.message : String(e)}`,
      )
    }
  }

  function confirmBindPlan() {
    openConfirmModal({
      title: "Bind Plan",
      children: (
        <Typography>
          Are you sure to bind SQL <Code>{sqlDigest.slice(0, 8) + "..."}</Code>{" "}
          with plan <Code>{curPlanDigest.slice(0, 8) + "..."}</Code> ?
        </Typography>
      ),
      labels: { confirm: "Bind", cancel: "Cancel" },
      onConfirm: bindPlan,
    })
  }

  function confirmUnbindPlan() {
    openConfirmModal({
      title: "Unbind Plans",
      children: (
        <Typography>
          Are you sure to unbind SQL{" "}
          <Code>{sqlDigest.slice(0, 8) + "..."}</Code> with{" "}
          <strong>all bound plans</strong> ?
        </Typography>
      ),
      confirmProps: { color: "red", variant: "outline" },
      labels: { confirm: "Unbind", cancel: "Cancel" },
      onConfirm: unbindPlan,
    })
  }

  if (!curPlanDigest || curPlanDigest === "all") {
    return null
  }
  if (!isSupport) {
    return (
      <Tooltip label="Bind plan is not supported in this version">
        <Button disabled size="xs">
          Bind
        </Button>
      </Tooltip>
    )
  }
  if (!canBind) {
    return (
      <Tooltip label="This plan can not be bound">
        <Button disabled size="xs">
          Bind
        </Button>
      </Tooltip>
    )
  }
  if (bindPlanDigests.length > 0) {
    if (bindPlanDigests.includes(curPlanDigest)) {
      return (
        <Button variant="transparent" color="red" onClick={confirmUnbindPlan}>
          Unbind
        </Button>
      )
    }
    return null
  }
  return (
    <Button variant="transparent" color="peacock" onClick={confirmBindPlan}>
      Bind
    </Button>
  )
}
