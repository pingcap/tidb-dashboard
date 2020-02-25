import { HeatmapData, HeatmapRange, DataTag } from './heatmap'
import client from '@/utils/client'

export async function fetchHeatmap(selection?: HeatmapRange, type: DataTag = 'written_bytes'): Promise<HeatmapData> {
  const resp = await client.dashboard.keyvisualHeatmapsGet(
    selection?.startkey,
    selection?.endkey,
    selection?.starttime,
    selection?.endtime,
    type,
  )
  return resp.data
}
