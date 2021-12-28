import React from 'react'
import {
  DetailsRow,
  IDetailsListProps,
  IDetailsRowStyles,
  IDetailsRowProps,
  IRawStyle,
} from 'office-ui-fabric-react'

export const createUnselectableRow = (
  when: (props: IDetailsRowProps) => boolean,
  customStyles: IRawStyle | ((props: IDetailsRowProps) => IRawStyle)
) => {
  const renderRow: IDetailsListProps['onRenderRow'] = (props) => {
    if (!props) {
      return null
    }

    const styles: Partial<IDetailsRowStyles> = {}
    if (when(props)) {
      const s =
        typeof customStyles === 'function' ? customStyles(props) : customStyles
      styles.root = {
        pointerEvents: 'none',
        ...s,
      }
      styles.checkCell = {
        cursor: 'default',
      }
    }

    return <DetailsRow {...props} styles={styles} />
  }
  return renderRow
}
