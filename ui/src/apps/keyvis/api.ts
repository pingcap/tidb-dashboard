import { HeatmapData } from './heatmap'

const dummyData: HeatmapData = require('./dummydata.json')

export async function fetchDummyHeatmap() {
  return dummyData
}
