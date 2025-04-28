import { Trans, useTn } from "@pingcap-incubator/tidb-dashboard-lib-utils"
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

// @ts-expect-error @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function useLocales() {
  const { tt } = useTn("statement")
  // used for gogocode to scan and generate en.json before build
  tt(
    "Are you sure to bind SQL <code>{{sqlDigest}}</code> with the plan <code>{{planDigest}}</code>?",
  )
  tt(
    "Are you sure to unbind SQL <code>{{sqlDigest}}</code> with <strong>all bound plans</strong>?",
  )
}

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
  const { tt } = useTn("statement")
  const createBindPlanMut = useCreatePlanBindData(sqlDigest, curPlanDigest)
  const deleteBindPlanMut = useDeletePlanBindData(sqlDigest)

  async function bindPlan() {
    try {
      await createBindPlanMut.mutateAsync()
      notifier.success(
        tt("Bind plan {{planDigest}} successfully!", {
          planDigest: curPlanDigest.slice(0, 8) + "...",
        }),
      )
    } catch (e) {
      notifier.error(
        tt("Bind plan {{planDigest}} failed, reason: {{reason}}", {
          planDigest: curPlanDigest.slice(0, 8) + "...",
          reason: e instanceof Error ? e.message : String(e),
        }),
      )
    }
  }

  async function unbindPlan() {
    try {
      await deleteBindPlanMut.mutateAsync()
      notifier.success(tt("Unbind plans successfully!"))
    } catch (e) {
      notifier.error(
        tt("Unbind plans failed, reason: {{reason}}", {
          reason: e instanceof Error ? e.message : String(e),
        }),
      )
    }
  }

  function confirmBindPlan() {
    openConfirmModal({
      title: tt("Bind Plan"),
      children: (
        <Typography>
          <Trans
            ns="statement"
            i18nKey={
              "Are you sure to bind SQL <code>{{sqlDigest}}</code> with the plan <code>{{planDigest}}</code>?"
            }
            values={{
              sqlDigest: sqlDigest.slice(0, 8) + "...",
              planDigest: curPlanDigest.slice(0, 8) + "...",
            }}
            components={{ code: <Code /> }}
          />
        </Typography>
      ),
      labels: { confirm: tt("Bind"), cancel: tt("Cancel") },
      onConfirm: bindPlan,
    })
  }

  function confirmUnbindPlan() {
    openConfirmModal({
      title: tt("Unbind Plans"),
      children: (
        <Typography>
          <Trans
            ns="statement"
            i18nKey={
              "Are you sure to unbind SQL <code>{{sqlDigest}}</code> with <strong>all bound plans</strong>?"
            }
            values={{ sqlDigest: sqlDigest.slice(0, 8) + "..." }}
            components={{ code: <Code />, strong: <strong /> }}
          />
        </Typography>
      ),
      confirmProps: { color: "red", variant: "outline" },
      labels: { confirm: tt("Unbind"), cancel: tt("Cancel") },
      onConfirm: unbindPlan,
    })
  }

  if (!curPlanDigest || curPlanDigest === "all") {
    return null
  }
  if (!isSupport) {
    return (
      <Tooltip
        label={tt(
          "Bind plan feature is only available in and above {{distro.tidb}} 6.6.0",
        )}
      >
        <Button disabled size="xs">
          {tt("Bind")}
        </Button>
      </Tooltip>
    )
  }
  if (!canBind) {
    return (
      <Tooltip label={tt("This plan can not be bound")}>
        <Button disabled size="xs">
          {tt("Bind")}
        </Button>
      </Tooltip>
    )
  }
  if (bindPlanDigests.length > 0) {
    if (bindPlanDigests.includes(curPlanDigest)) {
      return (
        <Button variant="transparent" c="red.7" onClick={confirmUnbindPlan}>
          {tt("Unbind")}
        </Button>
      )
    }
    return null
  }
  return (
    <Button variant="transparent" c="peacock.7" onClick={confirmBindPlan}>
      {tt("Bind")}
    </Button>
  )
}
