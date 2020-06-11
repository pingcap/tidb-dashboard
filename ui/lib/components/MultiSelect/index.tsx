import { IBaseSelectProps, BaseSelect } from '..'
import React, { useMemo, useState, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { usePersistFn } from '@umijs/hooks'
import { IColumn } from 'office-ui-fabric-react/lib/DetailsList'
import SelectionWithFilter from '@lib/utils/selectionWithFilter'
import { useShallowCompareEffect } from 'react-use'
import TableWithFilter from '../InstanceSelect/TableWithFilter'

import DropOverlay from './DropOverlay'

export interface IItemWithKey {
  key: string
}

export interface IMultiSelectProps<T extends IItemWithKey>
  extends Omit<IBaseSelectProps<string[]>, 'dropdownRender' | 'valueRender'> {
  items?: T[]
  filterFn?: (keyword: string, item: T) => boolean
  onRenderItem?: (item: T) => React.ReactNode
  onChange?: (value: string[]) => void
}

export default function MultiSelect<T extends IItemWithKey>({
  items,
  filterFn,
  onRenderItem,
  onChange,
  value,
  ...restProps
}: IMultiSelectProps<T>) {
  const { t } = useTranslation()

  const columns: IColumn[] = useMemo(
    () => [
      {
        name: 'name',
        key: 'name',
        minWidth: 100,
        onRender: (node: T) => {
          if (onRenderItem) {
            return onRenderItem(node)
          }
          return node.key
        },
      },
    ],
    [t, onRenderItem]
  )

  const onChangePersist = usePersistFn((v: string[]) => {
    onChange?.(v)
  })

  const selection = useRef(
    new SelectionWithFilter({
      onSelectionChanged: () => {
        const s = selection.current.getAllSelection() as T[]
        const keys = s.map((v) => v.key)
        onChangePersist([...keys])
      },
    })
  )

  useShallowCompareEffect(() => {
    selection.current?.resetAllSelection(value ?? [])
  }, [value])

  const renderDropdown = useCallback(
    () => (
      <DropOverlay<T>
        columns={columns}
        items={items ?? []}
        selection={selection.current}
        filterFn={filterFn}
      />
    ),
    [columns, items, filterFn]
  )

  return null
  // <BaseSelect
  //   dropdownRender={renderDropdown}
  //   value={value}
  //   valueRender={renderValue}
  //   placeholder={t('component.instanceSelect.placeholder')}
  //   {...restProps}
  // />
}
