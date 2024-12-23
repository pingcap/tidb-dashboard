import {
  CloseButton,
  Combobox,
  Group,
  InputBase,
  Typography,
  useCombobox,
  useMantineTheme,
} from "@tidbcloud/uikit"
import { IconCheck } from "@tidbcloud/uikit/icons"
import { useState } from "react"

export type FilterMultiSelectProps = {
  kind: string
  data: string[]
  value: string[]
  onChange: (value: string[]) => void

  width?: number
  disabled?: boolean
}

export function FilterMultiSelect({
  kind,
  data,
  value,
  onChange,
  width,
  disabled,
}: FilterMultiSelectProps) {
  const theme = useMantineTheme()

  const [search, setSearch] = useState("")
  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox.resetSelectedOption()
      // combobox.focusTarget()
      setSearch("")
    },

    onDropdownOpen: () => {
      combobox.focusSearchInput()
    },
  })

  const options = data
    .filter((item) => item.toLowerCase().includes(search.toLowerCase().trim()))
    .map((item) => (
      <Combobox.Option
        value={item}
        key={item}
        styles={{
          option: {
            "&:hover": {
              backgroundColor: theme.colors.carbon[3],
            },
          },
        }}
      >
        <Group wrap="nowrap">
          <Typography truncate>{item}</Typography>
          <Group ml="auto">
            {value.includes(item) && (
              <IconCheck
                size={16}
                strokeWidth={2}
                color={theme.colors.peacock[7]}
              />
            )}
          </Group>
        </Group>
      </Combobox.Option>
    ))

  function handleOptionSelect(val: string) {
    const newValue = value.includes(val)
      ? value.filter((v) => v !== val)
      : [...value, val]
    onChange(newValue)
  }

  function selectResult() {
    if (value.length === 0) {
      return <Typography c="carbon" truncate>{`Select ${kind}...`}</Typography>
    }
    if (value.length < 2) {
      return (
        <Group gap={4} wrap="nowrap">
          <Typography c="carbon" fw={500} truncate>
            {kind}
          </Typography>
          <Typography fw={500} truncate>
            {value.join(", ")}
          </Typography>
        </Group>
      )
    }
    return (
      <Group gap={4} wrap="nowrap">
        <Typography c="carbon" fw={500} truncate>
          {kind}
        </Typography>
        <Typography fw={500} truncate>
          {value.length} selected
        </Typography>
      </Group>
    )
  }

  return (
    <Combobox
      store={combobox}
      withinPortal={false}
      onOptionSubmit={handleOptionSelect}
      shadow="sm"
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
        <InputBase
          w={width}
          disabled={disabled}
          component="button"
          type="button"
          pointer
          rightSection={
            value.length > 0 ? (
              <CloseButton
                size="sm"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onChange([])}
                aria-label="Clear value"
              />
            ) : (
              <Combobox.Chevron />
            )
          }
          onClick={() => combobox.toggleDropdown()}
          rightSectionPointerEvents={value === null ? "none" : "all"}
        >
          {selectResult()}
        </InputBase>
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Search
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          placeholder={`Search ${kind.toLowerCase()}`}
          styles={{
            input: {
              border: "none",
            },
          }}
        />
        <Combobox.Options>
          {options.length > 0 ? (
            options
          ) : (
            <Combobox.Empty>Nothing found</Combobox.Empty>
          )}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  )
}
