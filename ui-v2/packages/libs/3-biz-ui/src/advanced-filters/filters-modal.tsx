import {
  AdvancedFilterItem,
  useTn,
} from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { ActionIcon, Box, Modal } from "@tidbcloud/uikit"
import { useDisclosure } from "@tidbcloud/uikit/hooks"
import { IconFilterFunnel02, IconPlus } from "@tidbcloud/uikit/icons"
import { useState } from "react"

import { AdvancedFilterInfo, AdvancedFilterSettingItem } from "./filter-setting"
import { AdvancedFiltersSetting, newFilterSettingItem } from "./filters-setting"
import { I18nNamespace, updateI18nLocales } from "./locales"

export function AdvancedFiltersModal({
  availableFilters,
  advancedFilters,
  onUpdateFilters,
  reqFilterInfo,
}: {
  availableFilters: Array<string | { label: string; value: string }>
  advancedFilters: AdvancedFilterItem[]
  onUpdateFilters?: (items: AdvancedFilterItem[]) => void
  reqFilterInfo?: (filterName: string) => Promise<AdvancedFilterInfo>
}) {
  const { tt } = useTn("advanced-filters")

  const hasFilters = advancedFilters.length > 0

  const [opened, { open, close }] = useDisclosure(false)

  const [settingItems, setSettingItems] = useState<AdvancedFilterSettingItem[]>(
    [],
  )

  function handleOpen() {
    // sync with advancedFilters when open modal
    if (advancedFilters.length === 0) {
      setSettingItems([newFilterSettingItem()])
    } else {
      const now = Date.now() // milliseconds
      setSettingItems(
        advancedFilters.map((f, i) => ({
          ...f,
          createdAt: now - i * 100,
          deleted: false,
        })),
      )
    }
    open()
  }

  function handleSubmit() {
    const items = settingItems.filter(
      (i) => !i.deleted && !!i.name && !!i.operator && !!i.values[0],
    )
    onUpdateFilters?.(items)
    close()
  }

  const [filtersInfo, setFiltersInfo] = useState<AdvancedFilterInfo[]>([])

  function handleReqFilterInfo(filterName: string) {
    reqFilterInfo?.(filterName).then((d) =>
      setFiltersInfo((prev) => [...prev, d]),
    )
  }

  return (
    <>
      <ActionIcon
        variant={"default"}
        w={48}
        size={40}
        color={hasFilters ? "peacock" : undefined}
        onClick={handleOpen}
      >
        <IconFilterFunnel02 size={16} />
        {hasFilters ? <Box pl={2}>{advancedFilters.length}</Box> : <IconPlus />}
      </ActionIcon>

      <Modal
        size="auto"
        title={tt("Advanced Filters")}
        opened={opened}
        onClose={close}
      >
        <AdvancedFiltersSetting
          availableFilters={availableFilters || []}
          filtersInfo={filtersInfo}
          reqFilterInfo={handleReqFilterInfo}
          filters={settingItems}
          onUpdateFilters={setSettingItems}
          onSubmit={handleSubmit}
          onClose={close}
        />
      </Modal>
    </>
  )
}

AdvancedFiltersModal.i18nNamespace = I18nNamespace
AdvancedFiltersModal.updateI18nLocales = updateI18nLocales
