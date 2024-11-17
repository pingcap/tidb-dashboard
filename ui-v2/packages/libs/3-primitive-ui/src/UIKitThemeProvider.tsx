import { useColorScheme } from "@tidbcloud/uikit"
import { ThemeProvider } from "@tidbcloud/uikit/theme"

export const UIKitThemeProvider = ({
  children,
}: React.PropsWithChildren<unknown>) => {
  const { colorScheme } = useColorScheme("auto", {
    getInitialValueInEffect: false,
    key: "mantine-color-scheme",
  })

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
