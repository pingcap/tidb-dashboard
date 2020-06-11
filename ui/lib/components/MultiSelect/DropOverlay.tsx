import React, { useState, useMemo } from 'react'
import { IColumn, ISelection } from 'office-ui-fabric-react/lib/DetailsList'
import { useTranslation } from 'react-i18next'
import { IItemWithKey } from '.'
import TableWithFilter from '../InstanceSelect/TableWithFilter'

const containerStyle = { fontSize: '0.8rem' }

export interface IDropOverlayProps<T extends IItemWithKey> {
  selection: ISelection
  columns: IColumn[]
  items: T[]
  filterFn?: (keyword: string, item: T) => boolean
}

function DropOverlay<T extends IItemWithKey>({
  selection,
  columns,
  items,
  filterFn,
}: IDropOverlayProps<T>) {
  const { t } = useTranslation()
  const [keyword, setKeyword] = useState('')

  const filteredItems = useMemo(() => {
    if (keyword.length === 0) {
      return items
    }
    const filter =
      filterFn == undefined
        ? (it) => it.key.indexOf(keyword) > -1
        : (it) => filterFn(keyword, it)
    return items.filter(filter)
  }, [items, keyword, filterFn])

  return (
    <TableWithFilter
      selection={selection}
      filterPlaceholder={t('component.instanceSelect.filterPlaceholder')}
      filter={keyword}
      onFilterChange={setKeyword}
      tableMaxHeight={300}
      tableWidth={100}
      columns={columns}
      items={filteredItems}
      containerStyle={containerStyle}
    />
  )
}

const typedMemo: <T>(c: T) => T = React.memo

export default typedMemo(DropOverlay)
