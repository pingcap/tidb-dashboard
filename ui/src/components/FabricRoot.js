import React from 'react'
import { Icon } from 'antd'
import { createTheme, registerIcons } from 'office-ui-fabric-react/lib/Styling'
import { Customizations } from 'office-ui-fabric-react/lib/Utilities'

registerIcons({
  icons: {
    sortup: <Icon type="arrow-up" />,
    sortdown: <Icon type="arrow-down" />,
  },
})

const theme = createTheme({
  defaultFontStyle: { fontFamily: 'inherit', fontSize: '1em' },
})

Customizations.applySettings({ theme })

export default function FabricRoot({ children }) {
  return <>{children}</>
}
