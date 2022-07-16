import React, { useState, useMemo } from 'react'
import { AntCheckboxGroupHeader } from '../'
import { IColumn, ISelection } from 'office-ui-fabric-react/lib/DetailsList'
import {
  IInstanceTableItem,
  filterInstanceTable
} from '@lib/utils/instanceTable'
import { useTranslation } from 'react-i18next'
import TableWithFilter, { ITableWithFilterRefProps } from './TableWithFilter'

const groupProps = {
  onRenderHeader: (props) => <AntCheckboxGroupHeader {...props} />
}

export interface IDropOverlayProps {
  selection: ISelection
  columns: IColumn[]
  items: IInstanceTableItem[]
  filterTableRef?: React.Ref<ITableWithFilterRefProps>
  containerProps?: React.HTMLAttributes<HTMLDivElement>
}

function DropOverlay({
  selection,
  columns,
  items,
  filterTableRef,
  containerProps
}: IDropOverlayProps) {
  const { t } = useTranslation()
  const [keyword, setKeyword] = useState('')

  const [finalItems, finalGroups] = useMemo(() => {
    return filterInstanceTable(items, keyword)
  }, [items, keyword])

  const { style: containerStyle, ...restContainerProps } = containerProps ?? {}
  const finalContainerProps = useMemo(() => {
    const style: React.CSSProperties = {
      fontSize: '0.9rem',
      ...containerStyle
    }
    return {
      style,
      ...restContainerProps
    } as React.HTMLAttributes<HTMLDivElement> & Record<string, string>
  }, [containerStyle, restContainerProps])

  return (
    <TableWithFilter
      selection={selection}
      filterPlaceholder={t('component.instanceSelect.filterPlaceholder')}
      filter={keyword}
      onFilterChange={setKeyword}
      tableMaxHeight={300}
      tableWidth={400}
      columns={columns}
      items={finalItems}
      groups={finalGroups}
      groupProps={groupProps}
      containerProps={finalContainerProps}
      ref={filterTableRef}
    />
  )
}

export default React.memo(DropOverlay)
