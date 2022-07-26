import { HeatmapData, HeatmapRange, DataTag } from '../heatmap/types'
import { IKeyVizDataSource } from '../context'

export async function fetchHeatmap(
  fetcher: IKeyVizDataSource['keyvisualHeatmapsGet'],
  selection?: HeatmapRange,
  type: DataTag = 'written_bytes'
): Promise<HeatmapData> {
  const resp = await fetcher(
    selection?.startkey,
    selection?.endkey,
    selection?.starttime,
    selection?.endtime,
    type
  )
  reverse(resp.data)
  return resp.data
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
