// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

import { LegendPath } from '@elastic/charts'

// HACK: Use elastic-charts internal api for the legend hover
// sync with https://github.com/elastic/elastic-charts/blob/master/packages/charts/src/state/actions/legend.ts

export const ON_LEGEND_ITEM_OVER = 'ON_LEGEND_ITEM_OVER'

export const ON_LEGEND_ITEM_OUT = 'ON_LEGEND_ITEM_OUT'

interface LegendItemOverAction {
  type: typeof ON_LEGEND_ITEM_OVER
  legendPath: LegendPath
}

interface LegendItemOutAction {
  type: typeof ON_LEGEND_ITEM_OUT
}

function onLegendItemOverAction(legendPath: LegendPath): LegendItemOverAction {
  return { type: ON_LEGEND_ITEM_OVER, legendPath }
}

function onLegendItemOutAction(): LegendItemOutAction {
  return { type: ON_LEGEND_ITEM_OUT }
}

export const onLegendItemOver = (chart: any, key: string) => {
  const legendItems = chart.chartStore
    .getState()
    .internalChartState.getLegendItems(chart.chartStore.getState())
  if (!legendItems?.length) {
    return
  }
  const item = legendItems.find((it) => it.seriesIdentifiers[0].specId === key)
  if (!item) {
    return
  }

  chart.chartStore.dispatch(onLegendItemOverAction(item.path))
}

export const onLegendItemOut = (chart) => {
  chart.chartStore.dispatch(onLegendItemOutAction())
}
