import React from 'react'
import { ScrollablePane } from 'office-ui-fabric-react/lib/ScrollablePane'
import { MarqueeSelection } from 'office-ui-fabric-react/lib/MarqueeSelection'
import { Selection, SelectionMode } from 'office-ui-fabric-react/lib/Selection'
import { MemoDetailsList, AntCheckboxGroupHeader } from '../'
import { useSize } from '@umijs/hooks'
import {
  DetailsListLayoutMode,
  IColumn,
  IGroup,
} from 'office-ui-fabric-react/lib/DetailsList'
import { IInstanceTableItem } from '@lib/utils/instanceTable'

import styles from './DropOverlay.module.less'

const groupProps = {
  onRenderHeader: (props) => <AntCheckboxGroupHeader {...props} />,
}

function DropOverlay({
  selection,
  columns,
  items,
  groups,
}: {
  selection: Selection
  columns: IColumn[]
  items: IInstanceTableItem[]
  groups: IGroup[]
}) {
  const [containerState, containerRef] = useSize<HTMLDivElement>()
  return (
    <div
      className={styles.instanceDropdown}
      style={{ height: containerState.height, maxHeight: 400, width: 400 }}
    >
      <ScrollablePane>
        <div ref={containerRef}>
          <MarqueeSelection selection={selection} isDraggingConstrainedToRoot>
            <MemoDetailsList
              selectionMode={SelectionMode.multiple}
              selection={selection}
              selectionPreservedOnEmptyClick
              layoutMode={DetailsListLayoutMode.justified}
              columns={columns}
              items={items}
              groups={groups}
              groupProps={groupProps}
              compact
            />
          </MarqueeSelection>
        </div>
      </ScrollablePane>
    </div>
  )
}

export default React.memo(DropOverlay)
