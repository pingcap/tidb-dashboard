import { ColorScheme, useColorScheme } from "@tidbcloud/uikit"
import { useHotkeys } from "@tidbcloud/uikit/hooks"
import { ThemeProvider } from "@tidbcloud/uikit/theme"

export const UiKitThemeProvider = ({
  children,
}: React.PropsWithChildren<unknown>) => {
  const { colorScheme, setColorScheme } = useColorScheme("auto", {
    getInitialValueInEffect: false,
    key: "mantine-color-scheme",
  })

  const toggleColorScheme = (value?: ColorScheme) => {
    setColorScheme(value || (colorScheme === "dark" ? "light" : "dark"))
  }

  useHotkeys([["mod+J", () => toggleColorScheme()]])

  return (
    <ThemeProvider
      colorScheme={colorScheme}
      notifications={{
        position: "top-center",
      }}
    >
      {children}
    </ThemeProvider>
  )
}
