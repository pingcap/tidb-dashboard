import {
  ColorScheme,
  ColorSchemeProvider,
  Global,
  MantineProvider,
  type MantineProviderProps,
} from "@tidbcloud/uikit"
import {
  useColorScheme,
  useHotkeys,
  useLocalStorage,
} from "@tidbcloud/uikit/hooks"
import { useTheme } from "@tidbcloud/uikit/theme"
import { useEffect, useState } from "react"

export const UIKitThemeProvider = ({
  withNormalizeCSS = true,
  children,
}: MantineProviderProps) => {
  const preferredColorScheme = useColorScheme()
  const [colorScheme, setColorScheme] = useLocalStorage<ColorScheme | "auto">({
    key: "mantine-color-scheme",
    defaultValue: "light",
    getInitialValueInEffect: true,
  })
  const toggleColorScheme = (value?: ColorScheme) => {
    setColorScheme(value || (colorScheme === "dark" ? "light" : "dark"))
  }
  const colorSchemeResult =
    colorScheme === "auto" ? preferredColorScheme : colorScheme
  const theme = useTheme(colorSchemeResult)
  const [colors, setColors] = useState(theme.colors)

  useEffect(() => {
    setColors(theme.colors)
  }, [colorSchemeResult])

  useHotkeys([["mod+J", () => toggleColorScheme()]])

  return (
    <ColorSchemeProvider
      colorScheme={colorSchemeResult}
      toggleColorScheme={toggleColorScheme}
    >
      <MantineProvider
        withNormalizeCSS={withNormalizeCSS}
        theme={{
          ...theme,
          colors,
          fontFamily: `'moderat', ${theme.fontFamily}`,
          colorScheme: colorSchemeResult,
        }}
      >
        <Global
          styles={(theme) => {
            return {
              html: {
                boxSizing: "border-box",
                fontVariantLigatures: "no-common-ligatures",
              },
              "a, .link": {
                color: theme.colors.peacock[7],
                textDecoration: "none",
                cursor: "pointer",
                outline: "none",
                "&:hover": {
                  color: theme.colors.peacock[8],
                  textDecoration: "underline",
                },
              },
              "*, :after, :before": {
                boxSizing: "inherit",
              },
              "input[type=email], input[type=password], input[type=search], input[type=text]":
                {
                  WebkitAppearance: "none",
                  MozAppearance: "none",
                },
              body: {
                fontSize: 14,
                lineHeight: 1.55,
              },
            }
          }}
        />
        {children}
      </MantineProvider>
    </ColorSchemeProvider>
  )
}
