import {
  addLangsLocales,
  useTn,
} from "@pingcap-incubator/tidb-dashboard-lib-utils"
import {
  ActionIcon,
  Checkbox,
  Combobox,
  Group,
  Typography,
  UnstyledButton,
  useCombobox,
  useMantineTheme,
} from "@tidbcloud/uikit"
import { IconSettings04 } from "@tidbcloud/uikit/icons"
import { useMemo, useState } from "react"

export type ColumnMultiSelectProps = {
  data: { label: string; val: string }[]
  value: string[]
  onChange: (value: string[]) => void
  onReset?: () => void
}

export function ColumnMultiSelect({
  data,
  value,
  onChange,
  onReset,
}: ColumnMultiSelectProps) {
  const { tt } = useTn("cols-multi-select")

  const theme = useMantineTheme()
  const [showSelected, setShowSelected] = useState(false)
  const [search, setSearch] = useState("")

  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox.resetSelectedOption()
      setSearch("")
    },
    onDropdownOpen: () => {
      combobox.focusSearchInput()
    },
  })

  const selectedData = data.filter(
    (item) => value.includes(item.val) || value.includes("all"),
  )

  const filteredData = useMemo(() => {
    let d = data.filter(
      (item) =>
        !showSelected || value.includes(item.val) || value.includes("all"),
    )
    const term = search.toLowerCase().trim()
    if (term) {
      d = d.filter(
        (item) =>
          item.val.toLowerCase().includes(term) ||
          item.label.toLowerCase().includes(term),
      )
    }
    return d
  }, [search, showSelected, data, value])

  const options = filteredData.map((item) => (
    <Combobox.Option
      value={item.val}
      key={item.val}
      styles={{
        option: {
          "&:hover": {
            backgroundColor: theme.colors.carbon[3],
          },
        },
      }}
    >
      <Group wrap="nowrap" gap="xs">
        <Checkbox
          checked={value.includes(item.val) || value.includes("all")}
          onChange={() => {}}
        />
        <Typography truncate>{item.label}</Typography>
      </Group>
    </Combobox.Option>
  ))

  function handleOptionSelect(val: string) {
    const selected = selectedData.map((item) => item.val)
    const newValue = selected.includes(val)
      ? selected.filter((v) => v !== val)
      : [...selected, val]
    onChange(newValue)
  }

  return (
    <Combobox
      store={combobox}
      onOptionSubmit={handleOptionSelect}
      shadow="sm"
      width={260}
      position="bottom-end"
      styles={{
        search: {
          border: "none",
          borderBottom: `1px solid ${theme.colors.carbon[3]}`,
          "&:hover": {
            borderBottom: `1px solid ${theme.colors.carbon[3]}`,
          },
          "&:focus": {
            borderBottom: `1px solid ${theme.colors.carbon[3]}`,
          },
        },
      }}
    >
      <Combobox.Target>
        <ActionIcon onClick={() => combobox.toggleDropdown()}>
          <IconSettings04 size={16} />
        </ActionIcon>
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Search
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          placeholder={tt("Search columns...")}
          styles={{
            input: {
              border: "none",
            },
          }}
        />
        <Combobox.Options mah={300} style={{ overflowY: "auto" }}>
          {options.length > 0 ? (
            options
          ) : (
            <Combobox.Empty>{tt("Nothing found")}</Combobox.Empty>
          )}
        </Combobox.Options>
        <Combobox.Footer>
          <Group>
            <Typography fz="xs" c="dimmed">
              {tt("{{selected}}/{{all}}", {
                selected: selectedData.length,
                all: data.length,
              })}
            </Typography>
            <Group ml="auto" justify="flex-end" gap="xs">
              <UnstyledButton
                fz="xs"
                c="peacock.7"
                onClick={() => setShowSelected(!showSelected)}
              >
                {showSelected ? tt("Show All") : tt("Show Selected")}
              </UnstyledButton>
              <UnstyledButton
                fz="xs"
                c="peacock.7"
                onClick={() => onChange(["all"])}
              >
                {tt("Select All")}
              </UnstyledButton>
              <UnstyledButton fz="xs" c="peacock.7" onClick={onReset}>
                {tt("Reset")}
              </UnstyledButton>
            </Group>
          </Group>
        </Combobox.Footer>
      </Combobox.Dropdown>
    </Combobox>
  )
}

//------------------------
// i18n
// auto updated by running `pnpm gen:locales`

const I18nNamespace = "cols-multi-select"
type I18nLocaleKeys =
  | "Nothing found"
  | "Reset"
  | "Search columns..."
  | "Select All"
  | "Show All"
  | "Show Selected"
  | "{{selected}}/{{all}}"
type I18nLocale = {
  [K in I18nLocaleKeys]?: string
}
const en: I18nLocale = {}
const zh: I18nLocale = {
  "Nothing found": "未找到",
  Reset: "重置",
  "Search columns...": "搜索列...",
  "Select All": "全选",
  "Show All": "显示全部",
  "Show Selected": "显示已选",
  "{{selected}}/{{all}}": "{{selected}}/{{all}}",
}

function updateI18nLocales(locales: { [ln: string]: I18nLocale }) {
  for (const [ln, locale] of Object.entries(locales)) {
    addLangsLocales({
      [ln]: {
        __namespace__: I18nNamespace,
        ...locale,
      },
    })
  }
}

updateI18nLocales({ en, zh })

ColumnMultiSelect.i18nNamespace = I18nNamespace
ColumnMultiSelect.updateI18nLocales = updateI18nLocales
