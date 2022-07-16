import {
  ISelection,
  IObjectWithKey,
  Selection,
  SelectionMode,
  ISelectionOptions,
  ISelectionOptionsWithRequiredGetKey,
  EventGroup,
  SELECTION_CHANGE
} from 'office-ui-fabric-react/lib/Utilities'

export default class SelectionWithFilter<T = IObjectWithKey>
  implements ISelection<T>
{
  private _inner: Selection<T>

  private _allItems: T[] = []
  private _allItemsMap: Map<string, T> = new Map()
  private _allSelectedKeysSet: Set<string> = new Set()
  private _itemKeysSet: Set<string> = new Set()

  private _allSelectionCache: T[] | null = null
  private _onSelectionChangedOriginal?: () => void

  get count(): number {
    return this._inner.count
  }
  set count(v: number) {
    this._inner.count = v
  }
  get mode(): SelectionMode {
    return this._inner.mode
  }
  canSelectItem(item: T, index?: number): boolean {
    return this._inner.canSelectItem(item, index)
  }
  setChangeEvents(isEnabled: boolean, suppressChange?: boolean) {
    return this._inner.setChangeEvents(isEnabled, suppressChange)
  }
  getItems(): T[] {
    return this._inner.getItems()
  }
  getSelection(): T[] {
    return this._inner.getSelection()
  }
  getSelectedIndices(): number[] {
    return this._inner.getSelectedIndices()
  }
  getSelectedCount(): number {
    return this._inner.getSelectedCount()
  }
  isRangeSelected(fromIndex: number, count: number): boolean {
    return this._inner.isRangeSelected(fromIndex, count)
  }
  isAllSelected(): boolean {
    return this._inner.isAllSelected()
  }
  isKeySelected(key: string): boolean {
    return this._inner.isKeySelected(key)
  }
  isIndexSelected(index: number): boolean {
    return this._inner.isIndexSelected(index)
  }
  setKeySelected(
    key: string,
    isSelected: boolean,
    shouldAnchor: boolean
  ): void {
    this._inner.setKeySelected(key, isSelected, shouldAnchor)
  }
  setIndexSelected(
    index: number,
    isSelected: boolean,
    shouldAnchor: boolean
  ): void {
    this._inner.setIndexSelected(index, isSelected, shouldAnchor)
  }
  selectToKey(key: string, clearSelection?: boolean | undefined): void {
    this._inner.selectToKey(key, clearSelection)
  }
  selectToIndex(index: number, clearSelection?: boolean | undefined): void {
    this._inner.selectToIndex(index, clearSelection)
  }
  toggleAllSelected(): void {
    this.setAllSelected(!this._inner.isAllSelected())
  }
  toggleKeySelected(key: string): void {
    this._inner.toggleKeySelected(key)
  }
  toggleIndexSelected(index: number): void {
    this._inner.toggleIndexSelected(index)
  }
  toggleRangeSelected(fromIndex: number, count: number): void {
    this._inner.toggleRangeSelected(fromIndex, count)
  }
  // Override
  setItems(items: T[], shouldClear?: boolean) {
    this._allSelectionCache = null
    if (shouldClear) {
      this._allSelectedKeysSet.clear()
    }

    // Only items in AllItems can be added
    const itemSubset: T[] = []
    this._itemKeysSet.clear()
    for (const item of items) {
      const key = this._inner.getKey(item)
      if (this._allItemsMap.has(key)) {
        this._itemKeysSet.add(key)
        itemSubset.push(item)
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.warn(
            'Warning: SelectionWithFilter::setItems is called with an item not in allItems',
            item,
            key
          )
        }
      }
    }

    this._inner.setChangeEvents(false)
    this._inner.setItems(itemSubset, shouldClear)
    // Re-select if newly added items are selected in allSelected
    for (const key of this._allSelectedKeysSet) {
      if (this._itemKeysSet.has(key)) {
        this._inner.setKeySelected(key, true, false)
      }
    }
    this._inner.setChangeEvents(true)
  }
  // Override
  setAllSelected(isAllSelected: boolean) {
    if (isAllSelected && this._itemKeysSet.size !== this._allItemsMap.size) {
      // If items is a true subset of allItems, we emulate a selectAll by selecting one by one.
      this._inner.setChangeEvents(false)
      for (const key of this._itemKeysSet) {
        this._inner.setKeySelected(key, true, false)
      }
      this._inner.setChangeEvents(true)
    } else {
      this._inner.setAllSelected(isAllSelected)
    }
  }

  constructor(
    ...options: T extends IObjectWithKey
      ? [] | [ISelectionOptions<T>]
      : [ISelectionOptionsWithRequiredGetKey<T>]
  ) {
    const { onSelectionChanged, ...rest } =
      options[0] || ({} as ISelectionOptions<T>)
    this._onSelectionChangedOriginal = onSelectionChanged
    this._inner = new (Selection as any)({
      onSelectionChanged: () => this._handleSelectionChanged(),
      ...rest
    })
  }

  private _handleSelectionChanged() {
    this._triggerSelectionChanged()
  }

  private _triggerSelectionChanged() {
    this._allSelectionCache = null
    EventGroup.raise(this, SELECTION_CHANGE)
    if (this._onSelectionChangedOriginal) {
      this._onSelectionChangedOriginal()
    }
  }

  setAllItems(items: T[]) {
    this._allSelectionCache = null
    this._allItems = items
    this._allItemsMap.clear()
    for (const item of items) {
      const key = this._inner.getKey(item)
      this._allItemsMap.set(key, item)
    }
    // Ensure `items` is a subset of `alllItems`. If not, update `items`.
    const filteredItems = this._inner.getItems()
    const newItems: T[] = []
    for (const item of filteredItems) {
      const key = this._inner.getKey(item)
      if (this._allItemsMap.has(key)) {
        newItems.push(item)
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log(
            'Note: SelectionWithFilter::setAllItems is filtering away an item previously in items but not in allItems',
            item,
            key
          )
        }
      }
    }
    if (filteredItems.length !== newItems.length) {
      this.setItems(newItems)
    }
  }

  getAllItems(): T[] {
    return this._allItems
  }

  getAllSelection(): T[] {
    if (!this._allSelectionCache) {
      this._allSelectionCache = []
      for (const [key, item] of this._allItemsMap) {
        // Selected state of the internal Selection takes precedence
        if (this._itemKeysSet.has(key)) {
          if (this._inner.isKeySelected(key)) {
            this._allSelectionCache.push(item)
          }
        } else {
          if (this._allSelectedKeysSet.has(key)) {
            this._allSelectionCache.push(item)
          }
        }
      }
      // Sync current selection to _allSelectedKeysSet. This is optional but
      // can avoid unnecessary selectionChanged event when calling `resetAllSelection`
      // again with the same selection.
      this._allSelectedKeysSet.clear()
      for (const key of this._allSelectionCache) {
        this._allSelectedKeysSet.add(this._inner.getKey(key))
      }
    }

    return this._allSelectionCache
  }

  resetAllSelection(selectedKeys: string[]) {
    if (process.env.NODE_ENV === 'development') {
      console.groupCollapsed('SelectionWithFilter.resetAllSelection')
      console.log('selectedKeys', selectedKeys)
      console.log('_allSelectedKeysSet', this._allSelectedKeysSet)
      console.groupEnd()
    }
    // Check whether update can be avoided
    let unChanged = true
    let validSelectedKeysCount = 0
    for (const key of selectedKeys) {
      if (this._allItemsMap.has(key)) {
        validSelectedKeysCount++
        if (!this._allSelectedKeysSet.has(key)) {
          unChanged = false
          break
        }
      }
    }
    if (validSelectedKeysCount !== this._allSelectedKeysSet.size) {
      unChanged = false
    }
    if (unChanged) {
      return
    }

    this._allSelectedKeysSet.clear()
    for (const key of selectedKeys) {
      if (this._allItemsMap.has(key)) {
        this._allSelectedKeysSet.add(key)
      }
    }
    // Update selection subset
    this._inner.setChangeEvents(false)
    this._inner.setAllSelected(false)
    for (const key of selectedKeys) {
      if (this._itemKeysSet.has(key)) {
        this._inner.setKeySelected(key, true, false)
      }
    }
    this._inner.setChangeEvents(true, true)
    this._triggerSelectionChanged() // Force trigger a selection change anyway
  }

  setAllSelectionSelected(isAllSelected: boolean) {
    this._inner.setChangeEvents(false)
    if (!isAllSelected) {
      this._allSelectedKeysSet.clear()
      this._inner.setAllSelected(false)
    } else {
      for (const key of this._allItemsMap.keys()) {
        this._allSelectedKeysSet.add(key)
      }
      this._inner.setAllSelected(true)
    }
    this._inner.setChangeEvents(true, true)
    this._triggerSelectionChanged() // Force trigger a selection change anyway
  }
}
