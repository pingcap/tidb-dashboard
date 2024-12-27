import { FilterMultiSelect } from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import { AdvancedFilterItem } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import {
  ActionIcon,
  Box,
  Button,
  Group,
  Modal,
  Select,
  Stack,
  TextInput,
  Typography,
} from "@tidbcloud/uikit"
import { useDisclosure } from "@tidbcloud/uikit/hooks"
import { IconFilterFunnel02, IconTrash01 } from "@tidbcloud/uikit/icons"
import { useState } from "react"

import { useListUrlState } from "../../url-state/list-url-state"
import {
  useAdvancedFilterInfoData,
  useAdvancedFilterNamesData,
} from "../../utils/use-data"

type AdvancedFilterSettingItem = AdvancedFilterItem & {
  createdAt: number
  deleted: boolean
}

function newFilterSettingItem(): AdvancedFilterSettingItem {
  return {
    filterName: "",
    filterOperator: "",
    filterValues: [],
    createdAt: Date.now(),
    deleted: false,
  }
}

export function AdvancedFiltersModal() {
  const [opened, { open, close }] = useDisclosure(false)

  const { advancedFilters, setAdvancedFilters } = useListUrlState()

  const [settingItems, setSettingItems] = useState<AdvancedFilterSettingItem[]>(
    [],
  )

  const filteredItems = settingItems.filter((i) => !i.deleted)

  function handleOpen() {
    // sync with advancedFilters when open modal
    if (advancedFilters.length === 0) {
      setSettingItems([newFilterSettingItem()])
    } else {
      setSettingItems(
        advancedFilters.map((f, i) => ({
          ...f,
          createdAt: Date.now() + i,
          deleted: false,
        })),
      )
    }
    open()
  }

  function handleAddItem() {
    setSettingItems((s) => [...s, newFilterSettingItem()])
  }

  // update `deleted` to true to act as deleted
  function handleUpdateItem(item: AdvancedFilterSettingItem) {
    setSettingItems((s) =>
      s.map((i) => (i.createdAt === item.createdAt ? { ...i, ...item } : i)),
    )
  }

  function handleSubmit() {
    setAdvancedFilters(
      filteredItems.filter(
        (i) =>
          !!i.filterName && !!i.filterOperator && i.filterValues.length > 0,
      ),
    )
    close()
  }

  const { data: availableFilters } = useAdvancedFilterNamesData()

  return (
    <>
      <ActionIcon variant="transparent" color="gray" onClick={handleOpen}>
        <IconFilterFunnel02 size={16} />
        {advancedFilters.length > 0 && (
          <Box pl={2}>{advancedFilters.length}</Box>
        )}
      </ActionIcon>

      <Modal
        size="auto"
        title="Advanced Filters"
        opened={opened}
        onClose={close}
      >
        <Stack>
          {filteredItems.map((item, i) => (
            <AdvancedFilterItemSetting
              key={item.createdAt}
              item={item}
              onUpdate={handleUpdateItem}
              availableFilters={availableFilters || []}
              showDelete={filteredItems.length > 1}
              conditionLabel={i === 0 ? "WHEN" : "AND"}
            />
          ))}

          <Group>
            <Button variant="outline" onClick={handleAddItem}>
              Add Filter
            </Button>
            <Group ml="auto">
              <Button variant="default" onClick={close}>
                Cancel
              </Button>
              <Button onClick={handleSubmit}>Save</Button>
            </Group>
          </Group>
        </Stack>
      </Modal>
    </>
  )
}

function AdvancedFilterItemSetting({
  availableFilters,
  item,
  onUpdate,
  showDelete = true,
  conditionLabel = "AND",
}: {
  availableFilters: string[]
  item: AdvancedFilterSettingItem
  onUpdate?: (item: AdvancedFilterSettingItem) => void
  showDelete?: boolean
  conditionLabel?: string
}) {
  const { data: filterInfo } = useAdvancedFilterInfoData(item.filterName)

  return (
    <Group>
      <Typography w={42}>{conditionLabel}</Typography>

      <Select
        w={240}
        searchable
        placeholder="Filter Name"
        data={availableFilters}
        value={item.filterName}
        onChange={(v) =>
          onUpdate?.({ ...item, filterName: v || "", filterValues: [] })
        }
      />

      <Box w={100}>
        {filterInfo && filterInfo.values.length > 0 && (
          <Select
            data={["in", "not in"]}
            value={item.filterOperator || "in"}
            onChange={(v) => onUpdate?.({ ...item, filterOperator: v || "in" })}
          />
        )}
        {filterInfo && filterInfo.values.length === 0 && (
          <Select
            data={["=", "!=", ">", ">=", "<", "<="]}
            value={item.filterOperator || "="}
            onChange={(v) => onUpdate?.({ ...item, filterOperator: v || "=" })}
          />
        )}
      </Box>

      <Box w={240}>
        {filterInfo && filterInfo.values.length > 0 && (
          <FilterMultiSelect
            kind={item.filterName}
            hideKind
            fullResultCount={3}
            data={filterInfo.values}
            value={item.filterValues}
            onChange={(v) =>
              onUpdate?.({
                ...item,
                filterValues: v,
                filterOperator: item.filterOperator || "in",
              })
            }
          />
        )}
        {filterInfo && filterInfo.values.length === 0 && (
          <TextInput
            rightSection={filterInfo.unit}
            value={item.filterValues[0]}
            onChange={(e) =>
              onUpdate?.({
                ...item,
                filterValues: [e.target.value],
                filterOperator: item.filterOperator || "=",
              })
            }
          />
        )}
      </Box>

      <Group ml="auto" w={28}>
        {showDelete && (
          <ActionIcon onClick={() => onUpdate?.({ ...item, deleted: true })}>
            <IconTrash01 size={16} />
          </ActionIcon>
        )}
      </Group>
    </Group>
  )
}
