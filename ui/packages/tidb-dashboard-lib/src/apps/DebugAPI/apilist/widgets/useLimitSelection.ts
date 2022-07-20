import { useCallback, useRef } from 'react'

export const useLimitSelection = (limit: number, emit: Function) => {
  const selectRef = useRef<any>(null)
  const onSelectChange = useCallback(
    (items: string[]) => {
      // Limit the available options to one option
      // There are no official limit props. https://github.com/ant-design/ant-design/issues/6626
      if (items.length > limit) {
        items.shift()
      }
      if (items.length === limit) {
        selectRef.current.blur()
      }
      emit?.(items)
    },
    [emit, limit, selectRef]
  )

  return {
    selectRef,
    onSelectChange
  }
}
