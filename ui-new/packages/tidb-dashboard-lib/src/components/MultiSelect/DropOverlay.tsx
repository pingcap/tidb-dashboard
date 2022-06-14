import React, { useState, useMemo } from 'react'
import { IColumn, ISelection } from 'office-ui-fabric-react/lib/DetailsList'
import { useTranslation } from 'react-i18next'
import TableWithFilter, {
  ITableWithFilterRefProps
} from '../InstanceSelect/TableWithFilter'
import { IItem } from '.'

const containerProps: React.HTMLAttributes<HTMLDivElement> = {
  style: { fontSize: '0.9rem' }
}

export interface IDropOverlayProps<T> {
  selection: ISelection
  columns: IColumn[]
  items: T[]
  filterFn?: (keyword: string, item: T) => boolean
  filterTableRef?: React.Ref<ITableWithFilterRefProps>
}

function DropOverlay<T extends IItem>({
  selection,
  columns,
  items,
  filterFn,
  filterTableRef
}: IDropOverlayProps<T>) {
  const { t } = useTranslation()
  const [keyword, setKeyword] = useState('')

  const filteredItems = useMemo(() => {
    if (keyword.length === 0) {
      return items
    }
    const kw = keyword.toLowerCase()
    const filter =
      filterFn == null
        ? (it: T) =>
            it.key.toLowerCase().indexOf(kw) > -1 ||
            (it.label ?? '').toLowerCase().indexOf(kw) > -1
        : (it: T) => filterFn(keyword, it)
    return items.filter(filter)
  }, [items, keyword, filterFn])

  return (
    <TableWithFilter
      selection={selection}
      filterPlaceholder={t('component.multiSelect.filterPlaceholder')}
      filter={keyword}
      onFilterChange={setKeyword}
      tableMaxHeight={300}
      tableWidth={250}
      columns={columns}
      items={filteredItems}
      containerProps={containerProps}
      ref={filterTableRef}
    />
  )
}

const typedMemo: <T>(c: T) => T = React.memo

export default typedMemo(DropOverlay)
