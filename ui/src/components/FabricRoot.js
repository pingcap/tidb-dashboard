import React from 'react'
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons'
import { createTheme, registerIcons } from 'office-ui-fabric-react/lib/Styling'
import { Customizations } from 'office-ui-fabric-react/lib/Utilities'

registerIcons({
  icons: {
    sortup: <ArrowUpOutlined />,
    sortdown: <ArrowDownOutlined />,
  },
})

const theme = createTheme({
  defaultFontStyle: { fontFamily: 'inherit', fontSize: '1em' },
})

Customizations.applySettings({ theme })

export default function FabricRoot({ children }) {
  return <>{children}</>
}
