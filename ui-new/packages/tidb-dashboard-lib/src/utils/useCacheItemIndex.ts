import { useMemoizedFn } from 'ahooks'
import { CacheMgr } from './useCache'

export default function useCacheItemIndex(cacheMgr?: CacheMgr) {
  const CLICKED_ITEM_INDEX = 'clicked_item_index'

  const saveClickedItemIndex = useMemoizedFn((idx: number) => {
    cacheMgr?.set(CLICKED_ITEM_INDEX, idx)
  })

  const getClickedItemIndex = useMemoizedFn(() => {
    return Number(cacheMgr?.get(CLICKED_ITEM_INDEX) || -1)
  })

  return {
    saveClickedItemIndex,
    getClickedItemIndex
  }
}
