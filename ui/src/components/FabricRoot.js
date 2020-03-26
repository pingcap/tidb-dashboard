import React from 'react'
import { Icon } from 'antd'
import { createTheme, Customizations } from 'office-ui-fabric-react'
import { registerIcons } from 'office-ui-fabric-react/lib/Styling'

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
