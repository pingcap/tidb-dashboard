import { MultiSelect, MultiSelectProps } from "@tidbcloud/uikit"

export const FilterMultiSelect = ({
  value,
  data,
  onChange,
  ...rest
}: MultiSelectProps) => {
  return (
    <MultiSelect
      miw={240}
      {...rest}
      data={data}
      value={value}
      onChange={onChange}
    />
  )
}
