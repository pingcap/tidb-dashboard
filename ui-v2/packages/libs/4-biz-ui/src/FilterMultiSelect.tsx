import {
  Badge,
  Group,
  MultiSelect,
  MultiSelectProps,
  MultiSelectValueProps,
  SelectItem,
  Typography,
  useMantineTheme,
} from "@tidbcloud/uikit"
import { IconCheck } from "@tidbcloud/uikit/icons"
import { forwardRef, useMemo } from "react"

interface KindItemProps extends React.ComponentPropsWithoutRef<"div"> {
  value: string
  label: string
}

const KindSelectItem = forwardRef<HTMLDivElement, KindItemProps>(
  ({ value, label, ...others }: KindItemProps, ref) => {
    const showTick = value.startsWith("_")
    const theme = useMantineTheme()
    return (
      <div ref={ref} {...others}>
        <Group position="apart">
          <span>{label}</span>
          {showTick && <IconCheck size={16} color={theme.colors.peacock[5]} />}
        </Group>
      </div>
    )
  },
)

export const FilterMultiSelect = ({
  value,
  data,
  onChange,
  ...rest
}: MultiSelectProps) => {
  const allKinds = useMemo(() => {
    return data
      .map((ko) => {
        if (typeof ko === "string") {
          if (value?.includes(ko)) {
            return [
              { value: ko, label: ko },
              { value: "_" + ko, label: ko },
            ]
          }
          return { value: ko, label: ko }
        } else {
          if (value?.some((v) => ko.value === v)) {
            return [ko, { value: "_" + ko.value, label: ko.label }]
          }
          return ko
        }
      })
      .flat()
  }, [data, value])

  // a hack way
  // in default, selected items are not shown in dropdown
  // to keep them in the dropdown
  // we add an extra item with a prefix '_' to the selected items value
  // and show a tick icon for it to represent it's selected
  function handleKindsChange(newKinds: string[]) {
    // if a kind with '_' prefix is selected in the dropdown
    // it means we unselected the kind without '_' prefix
    const newSelectedKinds = newKinds
      .map((k) => {
        if (!k.startsWith("_") && !newKinds.includes("_" + k)) {
          return k
        }
        return []
      })
      .flat()
    onChange?.(newSelectedKinds)
  }

  const isStringArray = useMemo(
    () => data.every((item) => typeof item === "string"),
    [data],
  )

  const kindValueComponent: React.FC<
    React.PropsWithChildren<MultiSelectValueProps & { value: string }>
  > = ({ value: itemValue }) => {
    if (itemValue === value?.[value.length - 1]) {
      let displayValue
      if (isStringArray) {
        displayValue = value?.join(",")
      } else {
        displayValue = value?.map(
          (k) => (data as SelectItem[]).find((v) => v.value == k)?.label,
        )
      }
      return (
        <Group gap={4} ml={4} sx={{ overflow: "hidden", flex: 1 }}>
          <Typography size="sm" lineClamp={1} sx={{ flex: 1 }}>
            {displayValue}
          </Typography>
          {value.length > 1 && (
            <Badge bg="carbon.5" c="carbon.8" radius={8}>
              {value.length}
            </Badge>
          )}
        </Group>
      )
    }
    return null
  }

  return (
    <MultiSelect
      miw={240}
      {...rest}
      data={allKinds}
      value={value}
      onChange={handleKindsChange}
      itemComponent={KindSelectItem}
      valueComponent={kindValueComponent}
    />
  )
}
