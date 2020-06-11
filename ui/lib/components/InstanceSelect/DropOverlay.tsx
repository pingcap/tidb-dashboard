import React, { useState, useMemo } from 'react'
import { AntCheckboxGroupHeader } from '../'
import { IColumn, ISelection } from 'office-ui-fabric-react/lib/DetailsList'
import {
  IInstanceTableItem,
  filterInstanceTable,
} from '@lib/utils/instanceTable'
import { useTranslation } from 'react-i18next'
import TableWithFilter from './TableWithFilter'

const groupProps = {
  onRenderHeader: (props) => <AntCheckboxGroupHeader {...props} />,
}

const containerStyle = { fontSize: '0.8rem' }

export interface IDropOverlayProps {
  selection: ISelection
  columns: IColumn[]
  items: IInstanceTableItem[]
}

function DropOverlay({ selection, columns, items }: IDropOverlayProps) {
  const { t } = useTranslation()
  const [keyword, setKeyword] = useState('')

  const [finalItems, finalGroups] = useMemo(() => {
    return filterInstanceTable(items, keyword)
  }, [items, keyword])

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
      containerStyle={containerStyle}
    />
  )
}

export default React.memo(DropOverlay)
