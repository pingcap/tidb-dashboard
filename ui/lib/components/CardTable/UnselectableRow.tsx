import React from 'react'
import { getTheme } from 'office-ui-fabric-react/lib/Styling'
import {
  DetailsRow,
  IDetailsListProps,
  IDetailsRowStyles,
  IDetailsRowProps,
} from 'office-ui-fabric-react'

const theme = getTheme()

export const createUnselectableRow = (
  when: (props: IDetailsRowProps) => boolean
) => {
  const renderRow: IDetailsListProps['onRenderRow'] = (props) => {
    if (!props) {
      return null
    }

    const customStyles: Partial<IDetailsRowStyles> = {}
    if (when(props)) {
      customStyles.root = {
        backgroundColor: theme.palette.neutralLighter,
        cursor: 'not-allowed',
        pointerEvents: 'none',
        color: '#aaa',
        fontStyle: 'italic',
      }
    }

    return <DetailsRow {...props} styles={customStyles} />
  }
  return renderRow
}
