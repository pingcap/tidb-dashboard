import React from 'react'
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  DownOutlined,
  RightOutlined,
} from '@ant-design/icons'
import { createTheme, registerIcons } from 'office-ui-fabric-react/lib/Styling'
import { Customizations } from 'office-ui-fabric-react/lib/Utilities'

registerIcons({
  icons: {
    SortUp: <ArrowUpOutlined />,
    SortDown: <ArrowDownOutlined />,
    chevronrightmed: <RightOutlined />,
    tag: <DownOutlined />,
  },
})

const theme = createTheme({
  defaultFontStyle: { fontFamily: 'inherit', fontSize: '1em' },
})

Customizations.applySettings({ theme })

export default function Root({ children }) {
  return <>{children}</>
}
