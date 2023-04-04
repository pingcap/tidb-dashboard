import { IBaseSelectProps, BaseSelect, TextWrap } from '..'
import { ITableWithFilterRefProps } from '../InstanceSelect/TableWithFilter'
import React, { useMemo, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useMemoizedFn, useControllableValue } from 'ahooks'
import { IColumn } from 'office-ui-fabric-react/lib/DetailsList'
import SelectionWithFilter from '@lib/utils/selectionWithFilter'
import { useShallowCompareEffect } from 'react-use'
import { addTranslationResource } from '@lib/utils/i18n'
import { Tooltip } from 'antd'

import DropOverlay from './DropOverlay'
import PlainMultiSelect from './Plain'
import { useChange } from '@lib/utils/useChange'

const translations = {
  en: {
    filterPlaceholder: 'Filter',
    selected: '{{n}} selected',
    columnTitle: 'Items'
  },
  zh: {
    filterPlaceholder: '过滤',
    selected: '已选择 {{n}} 项',
    columnTitle: '选择项'
  }
}

for (const key in translations) {
  addTranslationResource(key, {
    component: {
      multiSelect: translations[key]
    }
  })
}

export interface IItem {
  key: string
  label?: string
}

export interface IMultiSelectProps<T>
  extends Omit<IBaseSelectProps<string[]>, 'dropdownRender' | 'valueRender'> {
  items?: T[]
  filterFn?: (keyword: string, item: T) => boolean
  onChange?: (value: string[]) => void
  selectedValueTransKey?: string
  columnTitle?: string
}

function MultiSelect<T extends IItem>(props: IMultiSelectProps<T>) {
  const [internalVal, setInternalVal] = useControllableValue<string[]>(props)
  const setInternalValPersist = useMemoizedFn(setInternalVal)
  const {
    items,
    filterFn,
    selectedValueTransKey,
    columnTitle,
    placeholder,
    value, // only to exclude from restProps
    onChange, // only to exclude from restProps
    ...restProps
  } = props

  const { t } = useTranslation()

  const columns: IColumn[] = useMemo(
    () => [
      {
        name: columnTitle ?? t('component.multiSelect.columnTitle'),
        key: 'name',
        minWidth: 180,
        onRender: (node: T) => {
          let label
          if ('label' in node) {
            label = node.label
          } else {
            label = node.key
          }
          return (
            <TextWrap data-e2e="multi_select_options">
              <Tooltip title={label}>
                <span>{label}</span>
              </Tooltip>
            </TextWrap>
          )
        }
      }
    ],
    [t, columnTitle]
  )

  const selection = useRef(
    new SelectionWithFilter({
      onSelectionChanged: () => {
        if (process.env.NODE_ENV === 'development') {
          console.groupCollapsed(
            'MultiSelect onSelectionChanged',
            Math.random()
          )
          console.trace()
          console.groupEnd()
        }
        const s = selection.current.getAllSelection() as T[]
        const keys = s.map((v) => v.key)
        setInternalValPersist(keys)
      }
    })
  )

  useShallowCompareEffect(() => {
    selection.current?.resetAllSelection(internalVal ?? [])
  }, [internalVal])

  useChange(() => {
    selection.current?.setAllItems(items ?? [])
    // We may receive value first and then receive items. In this case, we need to re-assign
    // the selection according to value after receiving new items, so that values in newly appeared
    // items can be selected.
    selection.current?.resetAllSelection(internalVal ?? [])
  }, [items])

  const filterTableRef = useRef<ITableWithFilterRefProps>(null)

  const renderDropdown = useCallback(
    () => (
      <DropOverlay<T>
        columns={columns}
        items={items ?? []}
        selection={selection.current}
        filterFn={filterFn}
        filterTableRef={filterTableRef}
      />
    ),
    [columns, items, filterFn]
  )

  const handleOpened = useCallback(() => {
    filterTableRef.current?.focusFilterInput()
  }, [])

  const renderValue = useCallback(() => {
    if (placeholder && (!internalVal || internalVal.length === 0)) {
      return null
    }
    return t(selectedValueTransKey ?? 'component.multiSelect.selected', {
      n: internalVal?.length ?? 0,
      count: internalVal?.length ?? 0
    })
  }, [t, internalVal, selectedValueTransKey, placeholder])

  return (
    <BaseSelect
      dropdownRender={renderDropdown}
      value={internalVal}
      valueRender={renderValue}
      placeholder={placeholder}
      onOpened={handleOpened}
      {...restProps}
    />
  )
}

MultiSelect.Plain = PlainMultiSelect

export default MultiSelect
