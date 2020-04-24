import client from '@lib/client'
import { HeatmapData, HeatmapRange, DataTag } from '../heatmap/types'

export async function fetchHeatmap(
  selection?: HeatmapRange,
  type: DataTag = 'written_bytes'
): Promise<HeatmapData> {
  const resp = await client
    .getInstance()
    .keyvisualHeatmapsGet(
      selection?.startkey,
      selection?.endkey,
      selection?.starttime,
      selection?.endtime,
      type
    )
  reverse(resp.data)
  return resp.data
}

export async function fetchServiceStatus(): Promise<boolean> {
  return client
    .getInstance()
    .keyvisualConfigGet()
    .then((res) => res.data.auto_collection_enabled || false)
}

export async function updateServiceStatus(auto_collection_enabled: boolean) {
  await client.getInstance().keyvisualConfigPut({
    auto_collection_enabled,
  })
}

// Reverse the columns (key axis) of the matrix
// so that the direction of the axis matches the first quadrant
function reverse(data: HeatmapData) {
  data.keyAxis.reverse()
  for (const tag in data.data) {
    const d = data.data[tag]
    for (let col of d) {
      col.reverse()
    }
  }
}
