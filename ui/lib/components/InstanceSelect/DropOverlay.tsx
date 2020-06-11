import React, { useState, useMemo, useCallback } from 'react'
import { ScrollablePane } from 'office-ui-fabric-react/lib/ScrollablePane'
import { MarqueeSelection } from 'office-ui-fabric-react/lib/MarqueeSelection'
import { SelectionMode } from 'office-ui-fabric-react/lib/Selection'
import { MemoDetailsList, AntCheckboxGroupHeader } from '../'
import { useSize } from '@umijs/hooks'
import {
  DetailsListLayoutMode,
  IColumn,
  ISelection,
} from 'office-ui-fabric-react/lib/DetailsList'
import {
  IInstanceTableItem,
  filterInstanceTable,
} from '@lib/utils/instanceTable'
import { Input } from 'antd'

import styles from './DropOverlay.module.less'
import { useTranslation } from 'react-i18next'

const groupProps = {
  onRenderHeader: (props) => <AntCheckboxGroupHeader {...props} />,
}

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

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setKeyword(e.target.value)
    },
    []
  )

  // FIXME: We should put Input inside ScrollablePane after https://github.com/microsoft/fluentui/issues/13557 is resolved

  const [containerState, containerRef] = useSize<HTMLDivElement>()

  return (
    <div className={styles.instanceDropdown}>
      <Input
        placeholder={t('component.instanceSelect.filterPlaceholder')}
        allowClear
        onChange={handleInputChange}
      />
      <ScrollablePane
        style={{
          position: 'relative',
          height: containerState.height,
          maxHeight: 300,
          width: 400,
        }}
      >
        <div ref={containerRef}>
          <MarqueeSelection selection={selection} isDraggingConstrainedToRoot>
            <MemoDetailsList
              selectionMode={SelectionMode.multiple}
              selection={selection}
              selectionPreservedOnEmptyClick
              layoutMode={DetailsListLayoutMode.justified}
              columns={columns}
              items={finalItems}
              groups={finalGroups}
              groupProps={groupProps}
              setKey="set"
              compact
            />
          </MarqueeSelection>
        </div>
      </ScrollablePane>
    </div>
  )
}

export default React.memo(DropOverlay)
