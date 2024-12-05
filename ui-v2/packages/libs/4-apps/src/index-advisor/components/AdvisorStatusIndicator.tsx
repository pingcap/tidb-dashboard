import { StatusIndicator } from "@pingcap-incubator/tidb-dashboard-lib-biz-ui"
import { useMantineTheme } from "@tidbcloud/uikit"
import { lowerCase } from "lodash-es"
import React from "react"

const AdvisorStatusIndicator: React.FC<
  React.PropsWithChildren<{ label: string; reason?: string }>
> = ({ label, reason }) => {
  const theme = useMantineTheme()
  const statusMap: { [k: string]: { dotColor?: string; dotFill?: boolean } } = {
    open: {},
    applying: {
      dotFill: true,
      dotColor: theme.colors.blue[6],
    },
    applied: {
      dotFill: true,
    },
    closed: {
      dotColor: theme.colors.gray[6],
      dotFill: true,
    },
  }
  const { dotColor, dotFill } = statusMap[lowerCase(label)] ?? {}

  return (
    <StatusIndicator
      label={label}
      dotColor={dotColor ?? theme.colors.green[7]}
      dotFill={dotFill ?? false}
      tip={reason}
    />
  )
}

export default AdvisorStatusIndicator
