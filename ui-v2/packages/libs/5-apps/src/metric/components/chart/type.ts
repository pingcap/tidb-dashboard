import { PartialTheme, Position, SettingsProps } from "@elastic/charts"

// export const DEFAULT_TOOLTIP_SETTINGS: TooltipSettings = {
//   type: TooltipType.Crosshairs,
//   headerFormatter: timeTooltipFormatter,
//   stickTo: TooltipStickTo.MousePosition,
// }

export const DEFAULT_THEME: PartialTheme = {
  axes: {
    tickLine: { visible: false },
    tickLabel: { padding: { inner: 10 } },
    gridLine: {
      horizontal: {
        visible: true,
        dash: [3, 3],
      },
      vertical: {
        visible: true,
        dash: [3, 3],
      },
    },
  },
  crosshair: {
    crossLine: {
      dash: [],
    },
    line: {
      dash: [],
    },
  },
}

export const DEFAULT_CHART_SETTINGS: SettingsProps = {
  showLegend: true,
  legendPosition: Position.Right,
  legendSize: 130,
  // showLegendExtra: true,
  // tooltip: DEFAULT_TOOLTIP_SETTINGS,
  theme: DEFAULT_THEME,
}
