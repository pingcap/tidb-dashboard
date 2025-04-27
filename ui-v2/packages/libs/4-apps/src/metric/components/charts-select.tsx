import {
  ChartMultiSelect,
  ChartsSelectData,
} from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import { useTn } from "@pingcap-incubator/tidb-dashboard-lib-utils"
import { useMemo } from "react"

import { useChartsSelectState } from "../shared-state/memory-state"
import { useCurPanelConfigsData } from "../utils/use-data"

export function ChartsSelect() {
  const { tk } = useTn("metric")

  const { panelConfigData } = useCurPanelConfigsData()
  const chartsSelectData = useMemo(() => {
    const d: ChartsSelectData = []
    for (const panel of panelConfigData || []) {
      const category = tk(`panels.${panel.category}`, panel.category)
      for (const chart of panel.charts) {
        d.push({
          category,
          label: chart.title,
          val: chart.metricName,
        })
      }
    }
    return d
  }, [panelConfigData])

  const hiddenCharts = useChartsSelectState((s) => s.hiddenCharts)
  const setHiddenCharts = useChartsSelectState((s) => s.setHiddenCharts)

  const chartsSelectValue = useMemo(() => {
    return chartsSelectData
      .map((item) => item.val)
      .filter((v) => !hiddenCharts.includes(v))
  }, [chartsSelectData, hiddenCharts])

  function onReset() {
    const allData = chartsSelectData.map((item) => item.val)
    setHiddenCharts(hiddenCharts.filter((v) => !allData.includes(v)))
  }

  function onSelect(val: string) {
    setHiddenCharts(hiddenCharts.filter((v) => v !== val))
  }

  function onUnSelect(val: string) {
    setHiddenCharts([...hiddenCharts, val])
  }

  return (
    <ChartMultiSelect
      data={chartsSelectData}
      value={chartsSelectValue}
      onSelect={onSelect}
      onUnSelect={onUnSelect}
      onReset={onReset}
    />
  )
}
