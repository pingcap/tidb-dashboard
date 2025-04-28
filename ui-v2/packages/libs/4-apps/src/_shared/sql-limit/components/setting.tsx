import { LoadingSkeleton } from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import { useTn } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import {
  Button,
  Modal,
  Select,
  Stack,
  Typography,
  notifier,
} from "@tidbcloud/uikit"
import { useState } from "react"

import { useSettingModalState } from "../shared-state/memory-state"
import { useCreateSqlLimitData, useRuGroupsData } from "../utils/use-data"

function SqlLimitSettingBody() {
  const { data: ruGroups, isLoading } = useRuGroupsData()
  const setLimitMut = useCreateSqlLimitData()

  const setModalVisible = useSettingModalState((s) => s.setVisible)

  const [resourceGroup, setResourceGroup] = useState("")
  const [action, setAction] = useState("")

  const { tt } = useTn("sql-limit")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!resourceGroup || !action) {
      return
    }
    try {
      await setLimitMut.mutateAsync({ ruGroup: resourceGroup, action })
      notifier.success(tt("Set SQL limit successfully"))
      setModalVisible(false)
    } catch (_err) {
      notifier.error(tt("Set SQL limit failed"))
    }
  }

  if (isLoading) {
    return <LoadingSkeleton />
  }

  if (!ruGroups) {
    return null
  }

  if (ruGroups.length === 0) {
    return (
      <Typography>
        {tt(
          "There is no resource groups, please create a resource group manually first",
        )}
      </Typography>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <Stack>
        <Select
          placeholder={tt("Resource Group")}
          data={ruGroups}
          value={resourceGroup}
          onChange={(v) => setResourceGroup(v || "")}
        />
        <Select
          placeholder={tt("Action")}
          data={["DRYRUN", "COOLDOWN", "KILL"]}
          value={action}
          onChange={(v) => setAction(v || "")}
        />
        <Button ml="auto" type="submit" disabled={!resourceGroup || !action}>
          {tt("Set Limit")}
        </Button>
      </Stack>
    </form>
  )
}

export function SqlLimitSettingModal() {
  const modalVisible = useSettingModalState((s) => s.visible)
  const setModalVisible = useSettingModalState((s) => s.setVisible)
  const { tt } = useTn("sql-limit")

  return (
    <>
      <Button variant="default" size="xs" onClick={() => setModalVisible(true)}>
        {tt("Add or Update")}
      </Button>

      <Modal
        title={tt("SQL Limit Setting")}
        opened={modalVisible}
        onClose={() => {
          setModalVisible(false)
        }}
      >
        <SqlLimitSettingBody />
      </Modal>
    </>
  )
}
