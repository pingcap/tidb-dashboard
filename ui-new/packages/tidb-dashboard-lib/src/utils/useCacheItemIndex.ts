import { CacheMgr } from './useCache'

export default function useCacheItemIndex(cacheMgr: CacheMgr | null) {
  const CLICKED_ITEM_INDEX = 'clicked_item_index'
  function saveClickedItemIndex(idx: number) {
    cacheMgr?.set(CLICKED_ITEM_INDEX, idx)
  }
  function getClickedItemIndex(): number {
    return cacheMgr?.get(CLICKED_ITEM_INDEX) || -1
  }

  return {
    saveClickedItemIndex,
    getClickedItemIndex
  }
}
