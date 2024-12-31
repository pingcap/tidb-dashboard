import { useComputedColorScheme } from "@tidbcloud/uikit"
import { createStyles } from "@tidbcloud/uikit/utils"
import { useMemo } from "react"
import {
  JsonView,
  Props as JsonViewProps,
  allExpanded,
  darkStyles,
  defaultStyles,
} from "react-json-view-lite"

import "react-json-view-lite/dist/index.css"

const useStyles = createStyles(() => ({
  container: {
    paddingTop: 8,
    paddingBottom: 8,
    background: "transparent",
    lineHeight: 1.2,
    whiteSpace: "pre-wrap",
    wordWrap: "break-word",
  },
  basicChildStyle: {
    margin: 0,
    padding: 0,
  },
}))

export function CustomJsonView({ data }: JsonViewProps) {
  const colorScheme = useComputedColorScheme()
  const { classes } = useStyles()
  const style = useMemo(() => {
    const _style = colorScheme === "dark" ? darkStyles : defaultStyles
    return {
      ..._style,
      container: classes.container,
      basicChildStyle: classes.basicChildStyle,
    }
  }, [colorScheme])

  return <JsonView data={data} shouldExpandNode={allExpanded} style={style} />
}
