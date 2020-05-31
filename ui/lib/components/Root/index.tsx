import React, { useState, useEffect } from 'react'
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  DownOutlined,
  RightOutlined,
} from '@ant-design/icons'
import {
  createTheme,
  registerIcons,
  IPalette,
  IPartialTheme,
} from 'office-ui-fabric-react/lib/Styling'
import {
  Customizer,
  ICustomizations,
} from 'office-ui-fabric-react/lib/Utilities'
import {
  darkmodeEnabled,
  subscribeToggleDarkMode,
} from '@lib/utils/themeSwitch'

registerIcons({
  icons: {
    SortUp: <ArrowUpOutlined />,
    SortDown: <ArrowDownOutlined />,
    chevronrightmed: <RightOutlined />,
    tag: <DownOutlined />,
  },
})

const BaseTheme: IPartialTheme = {
  defaultFontStyle: { fontFamily: 'inherit', fontSize: '1em' },
}

const DarkDefaultPalette: Partial<IPalette> = {
  themeDarker: '#82c7ff',
  themeDark: '#6cb8f6',
  themeDarkAlt: '#3aa0f3',
  themePrimary: '#2899f5',
  themeSecondary: '#0078d4',
  themeTertiary: '#235a85',
  themeLight: '#004c87',
  themeLighter: '#043862',
  themeLighterAlt: '#092c47',
  black: '#ffffff',
  neutralDark: '#faf9f8',
  neutralPrimary: '#f3f2f1',
  neutralPrimaryAlt: '#c8c6c4',
  neutralSecondary: '#a19f9d',
  neutralSecondaryAlt: '#979693',
  neutralTertiary: '#797775',
  neutralTertiaryAlt: '#484644',
  neutralQuaternary: '#3b3a39',
  neutralQuaternaryAlt: '#323130',
  neutralLight: '#292827',
  neutralLighter: '#252423',
  neutralLighterAlt: '#201f1e',
  white: '#141414', // fixme: use ant design color
  redDark: '#F1707B',
}

const DarkTheme = createTheme({
  ...BaseTheme,
  palette: DarkDefaultPalette,
  semanticColors: {
    buttonText: DarkDefaultPalette.black,
    buttonTextPressed: DarkDefaultPalette.neutralDark,
    buttonTextHovered: DarkDefaultPalette.neutralPrimary,
    bodySubtext: DarkDefaultPalette.white,
    disabledBackground: DarkDefaultPalette.neutralQuaternaryAlt,
    inputBackgroundChecked: DarkDefaultPalette.themePrimary,
    menuBackground: DarkDefaultPalette.neutralLighter,
    menuItemBackgroundHovered: DarkDefaultPalette.neutralQuaternaryAlt,
    menuItemBackgroundPressed: DarkDefaultPalette.neutralQuaternary,
    menuDivider: DarkDefaultPalette.neutralTertiaryAlt,
    menuIcon: DarkDefaultPalette.themeDarkAlt,
    menuHeader: DarkDefaultPalette.black,
    menuItemText: DarkDefaultPalette.neutralPrimary,
    menuItemTextHovered: DarkDefaultPalette.neutralDark,
  },
})

const DarkCustomizations: ICustomizations = {
  settings: {
    theme: DarkTheme,
  },
  scopedSettings: {
    DetailsList: {
      styles: {
        headerWrapper: {
          selectors: {
            '.ms-DetailsHeader': {
              borderColor: DarkTheme.palette.neutralQuaternary,
            },
          },
        },
      },
    },
    DetailsRow: {
      styles: {
        root: {
          borderColor: DarkTheme.palette.neutralQuaternaryAlt,
        },
      },
    },
  },
}

const LightTheme = createTheme({ ...BaseTheme })

const LightCustomizations: ICustomizations = {
  settings: {
    theme: LightTheme,
  },
  scopedSettings: {},
}

export default function Root({ children }) {
  const [darkMode, setDarkMode] = useState(darkmodeEnabled())
  useEffect(() => {
    setDarkMode(darkmodeEnabled())
    const sub = subscribeToggleDarkMode(setDarkMode)
    return () => sub.unsubscribe()
  }, [])

  if (darkMode) {
    return <Customizer {...DarkCustomizations}>{children}</Customizer>
  } else {
    return <Customizer {...LightCustomizations}>{children}</Customizer>
  }
}
