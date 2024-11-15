import { useEffect } from "react"

const LIGHT_TOKEN = "charts-light-theme"
const DARK_TOKEN = "charts-dark-theme"

export function useChartTheme(theme: "light" | "dark") {
  useEffect(() => {
    if (theme === "light") {
      window.document.body.classList.remove(DARK_TOKEN)
      window.document.body.classList.add(LIGHT_TOKEN)
    } else {
      window.document.body.classList.remove(LIGHT_TOKEN)
      window.document.body.classList.add(DARK_TOKEN)
    }
  }, [theme])
}
