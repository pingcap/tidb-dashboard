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

  const hiddenCharts = useChartsSelectState((s) => s.hiddenCharts)
  const setHiddenCharts = useChartsSelectState((s) => s.setHiddenCharts)

  const { panelConfigData } = useCurPanelConfigsData()
  const chartsSelectData = useMemo(() => {
    const d: ChartsSelectData = []
    for (const panel of panelConfigData || []) {
      const category = tk(`panels.${panel.category}`, panel.category)
      for (const chart of panel.charts) {
        d.push({
          group: category,
          label: chart.title,
          val: chart.metricName,
        })
      }
    }
    return d
  }, [panelConfigData])

  const chartsSelectValue = useMemo(() => {
    const hidden = hiddenCharts
    const value: string[] = []
    for (const chart of chartsSelectData) {
      if (!hidden.includes(chart.val)) {
        value.push(chart.val)
      }
    }
    return value
  }, [chartsSelectData, hiddenCharts])

  // @todo: refine algorithm
  function handleChange(v: string[]) {
    const hidden = [...hiddenCharts]
    for (const chart of chartsSelectData) {
      if (!v.includes(chart.val)) {
        if (!hidden.includes(chart.val)) {
          hidden.push(chart.val)
        }
      } else {
        if (hidden.includes(chart.val)) {
          hidden.splice(hidden.indexOf(chart.val), 1)
        }
      }
    }
    setHiddenCharts(hidden)
  }

  function onReset() {
    handleChange(chartsSelectData.map((item) => item.val))
  }

  return (
    <ChartMultiSelect
      data={chartsSelectData}
      value={chartsSelectValue}
      onChange={handleChange}
      onReset={onReset}
    />
  )
}
