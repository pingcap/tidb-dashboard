import { LoadingSkeleton } from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import {
  formatDuration,
  useTn,
} from "@pingcap-incubator/tidb-dashboard-lib-utils"
import {
  Button,
  Card,
  Divider,
  Drawer,
  Group,
  Select,
  Stack,
  Switch,
  Typography,
  notifier,
  openConfirmModal,
} from "@tidbcloud/uikit"
import { useMemo, useState } from "react"

import { StatementConfigModel } from "../../models"
import {
  useStmtConfigData,
  useUpdateStmtConfigData,
} from "../../utils/use-data"

const MAX_SIZE_OPTIONS = Array.from(
  { length: 49 },
  (_, i) => (i + 2) * 100,
).map((i) => ({
  value: i + "",
  label: i + "",
}))

const WINDOW_SIZE_OPTIONS = [1, 5, 15, 30, 60].map((i) => ({
  value: i * 60 + "",
  label: i + "",
}))

const WINDOWS_NUMBER_OPTIONS = Array.from({ length: 255 }, (_, i) => i + 1).map(
  (i) => ({
    value: i + "",
    label: i + "",
  }),
)

function StatementSettingBody({
  config,
  onClose,
}: {
  config: StatementConfigModel
  onClose: () => void
}) {
  const { tt } = useTn("statement")
  const [enable, setEnable] = useState(config.enable)
  const [maxSize, setMaxSize] = useState(config.max_size)
  const [windowSize, setWindowSize] = useState(config.refresh_interval)
  const [windowsNumber, setWindowsNumber] = useState(config.history_size)
  const [internalQuery, setInternalQuery] = useState(config.internal_query)

  const total = useMemo(
    () => formatDuration(windowSize * windowsNumber),
    [windowSize, windowsNumber],
  )

  const updateMut = useUpdateStmtConfigData()

  async function handleUpdate() {
    try {
      await updateMut.mutateAsync({
        enable,
        max_size: maxSize,
        refresh_interval: windowSize,
        history_size: windowsNumber,
        internal_query: internalQuery,
      })
      notifier.success(tt("Update statement config successfully!"))
      onClose()
    } catch (_err) {
      notifier.error(tt("Update statement config failed!"))
    }
  }

  function handleSave() {
    if (!enable && config.enable) {
      openConfirmModal({
        title: tt("Disable Statement Feature"),
        children: tt(
          "Are you sure want to disable this feature? Current statement history will be cleared.",
        ),
        confirmProps: { color: "red", variant: "outline" },
        labels: { confirm: tt("Disable"), cancel: tt("Cancel") },
        onConfirm: handleUpdate,
      })
    } else {
      handleUpdate()
    }
  }

  return (
    <Stack gap="lg" pt={16}>
      <Switch
        checked={enable}
        onChange={(event) => setEnable(event.currentTarget.checked)}
        label={tt("Feature Enable")}
        description={tt(
          "Whether Statement feature is enabled. When enabled, there will be a small SQL statement execution overhead.",
        )}
      />
      {enable && (
        <>
          <Select
            label={tt("Max Number of Statements")}
            description={tt(
              "Max number of statement to collect. After exceeding, old statement information will be dropped. You may enlarge this setting when memory is sufficient and you discovered that data displayed in UI is incomplete.",
            )}
            value={maxSize + ""}
            onChange={(v) => setMaxSize(Number(v))}
            data={MAX_SIZE_OPTIONS}
          />
          <Select
            label={tt("Window Size (min)")}
            description={tt(
              "By reducing this setting you can select time range more precisely.",
            )}
            value={windowSize + ""}
            onChange={(v) => setWindowSize(Number(v))}
            data={WINDOW_SIZE_OPTIONS}
          />
          <Select
            label={tt("Windows Number")}
            description={tt(
              "By enlarging this setting more statement history will be preserved, with larger memory cost.",
            )}
            value={windowsNumber + ""}
            onChange={(v) => setWindowsNumber(Number(v))}
            data={WINDOWS_NUMBER_OPTIONS}
          />
          <Card shadow="none" p="xs">
            <Typography>{tt("SQL Statement Total History Size")}</Typography>
            <Typography c="dimmed" fz={12}>
              {tt("Window Size x Windows Number")}
            </Typography>
            <Typography variant="label-lg" fz={16}>
              {total}
            </Typography>
          </Card>
          <Switch
            checked={internalQuery}
            onChange={(event) => setInternalQuery(event.currentTarget.checked)}
            label={tt("Collect Internal Queries")}
            description={tt(
              "After enabled, TiDB internal queries will be collected as well.",
            )}
          />
        </>
      )}
      <Divider />
      <Group justify="flex-end">
        <Button variant="default" onClick={onClose}>
          {tt("Cancel")}
        </Button>
        <Button onClick={handleSave}>{tt("Save")}</Button>
      </Group>
    </Stack>
  )
}

export function StatementSettingDrawer({
  visible,
  onClose,
}: {
  visible: boolean
  onClose: () => void
}) {
  const { tt } = useTn("statement")
  const { data: configData, isLoading } = useStmtConfigData()

  return (
    <Drawer
      title={tt("Statement Setting")}
      position="right"
      opened={visible}
      onClose={onClose}
    >
      {isLoading && <LoadingSkeleton />}
      {!isLoading && configData && (
        <StatementSettingBody config={configData} onClose={onClose} />
      )}
    </Drawer>
  )
}
