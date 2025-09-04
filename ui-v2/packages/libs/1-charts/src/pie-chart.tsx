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
}

export function PieChart({
  theme = "light",
  id,
  data,
  unit,
  charSetting,
}: PieChartProps) {
  const _id = useId()

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
        valueFormatter={(v) => formatNumByUnit(v, unit || "", 1)}
        layers={[
          {
            groupByRollup: (d: PieChartData) => d.name,
          },
        ]}
      />
    </Chart>
  )
}
