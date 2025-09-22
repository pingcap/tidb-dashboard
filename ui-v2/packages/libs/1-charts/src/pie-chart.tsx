import {
  Chart,
  DARK_THEME,
  LIGHT_THEME,
  Partition,
  Settings,
  SettingsProps,
} from "@elastic/charts"
import { useId } from "react"

import { formatNumByUnit } from "./utils"

type PieChartData = {
  name: string
  value: number
}

type PieChartProps = {
  theme?: "light" | "dark"
  id?: string
  data: PieChartData[]
  unit?: string
  charSetting?: SettingsProps
  colors?: string[]
  valueFormatter?: (value: number) => string
}

export function PieChart({
  theme = "light",
  id,
  data,
  unit,
  charSetting,
  colors,
  valueFormatter,
}: PieChartProps) {
  const _id = useId()

  function formatValue(value: number) {
    return formatNumByUnit(value, unit || "", 1)
  }

  return (
    <Chart>
      <Settings
        showLegend
        legendSize={200}
        baseTheme={theme === "light" ? LIGHT_THEME : DARK_THEME}
        {...charSetting}
      />
      <Partition
        data={data}
        id={id || _id}
        valueAccessor={(d) => d.value}
        valueFormatter={valueFormatter || formatValue}
        layers={[
          {
            groupByRollup: (d: PieChartData) => d.name,
            shape: colors
              ? {
                  fillColor: (_k, i) => colors?.[i % colors.length] || "",
                }
              : undefined,
          },
        ]}
      />
    </Chart>
  )
}
