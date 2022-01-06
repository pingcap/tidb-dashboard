// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

// HACK: Use elastic-charts internal api for the legend hover
// sync with https://github.com/elastic/elastic-charts/blob/master/packages/charts/src/state/actions/legend.ts

export const ON_LEGEND_ITEM_OVER = 'ON_LEGEND_ITEM_OVER'

export const ON_LEGEND_ITEM_OUT = 'ON_LEGEND_ITEM_OUT'

export const onLegendItemOver = (chart: any, key: string) => {
  const legendItems = chart.chartStore
    .getState()
    .internalChartState.getLegendItems(chart.chartStore.getState())
  if (!legendItems?.length) {
    return
  }
  const item = legendItems.find((it) => it.seriesIdentifier.specId === key)
  if (!item) {
    return
  }

  chart.chartStore.dispatch({
    type: ON_LEGEND_ITEM_OVER,
    legendItemKey: item.seriesIdentifier.key,
  })
}

export const onLegendItemOut = (chart) => {
  chart.chartStore.dispatch({
    type: ON_LEGEND_ITEM_OUT,
  })
}
