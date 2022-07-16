import * as d3 from 'd3'

const heatmapColor = d3.interpolateRgbBasis([
  '#000000',
  '#080808',
  '#090909',
  '#101010',
  '#111111',
  '#121212',
  '#131313',
  '#141414',
  '#151515',
  '#171717',
  '#181818',
  '#191919',
  '#410c74',
  '#72067b',
  '#b00f53',
  '#fcc734',
  '#fbfc43',
  '#ffffb0'
])

export const rasterizeLevel = 100

export type ColorScale = (val: number) => d3.RGBColor
export type ColorScheme = {
  background: ColorScale
  label: ColorScale
  maxValue: number
  rasterizedColors: Uint32Array
}

export function getColorScheme(
  maxValue: number,
  brightness: number
): ColorScheme {
  const logScale = (d3 as any).scaleSymlog().domain([0, maxValue / brightness])
  const backgroundColorScale = (d: number) =>
    d3.color(heatmapColor(logScale(d)))! as d3.RGBColor
  const labelColorScale = (d: number) =>
    d3.hsl(backgroundColorScale(d)).l > 0.5
      ? (d3.color('black')! as d3.RGBColor)
      : (d3.color('white')! as d3.RGBColor)

  const rasterizedColors = new Uint32Array(rasterizeLevel + 1)
  for (let i = 0; i <= rasterizeLevel; i++) {
    const color = d3.color(
      backgroundColorScale(Math.pow(maxValue, i / rasterizeLevel))
    )
    const colorRgb = color.rgb()
    rasterizedColors[i] =
      colorRgb.r | (colorRgb.g << 8) | (colorRgb.b << 16) | 0xff000000
  }

  return {
    background: backgroundColorScale,
    label: labelColorScale,
    maxValue: maxValue,
    rasterizedColors
  }
}
