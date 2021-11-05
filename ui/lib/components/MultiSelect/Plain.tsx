import MultiSelect, { IMultiSelectProps, IItem } from '.'
import { useMemo } from 'react'
import React from 'react'

export interface IPlainMultiSelectProps
  extends Omit<IMultiSelectProps<IItem>, 'items' | 'filterFn'> {
  items?: string[]
}

export default function PlainMultiSelect({
  items,
  ...restProps
}: IPlainMultiSelectProps) {
  const objectItems = useMemo(
    () => items?.map((v) => ({ key: v })) ?? [],
    [items]
  )
  return <MultiSelect items={objectItems} {...restProps} />
}
