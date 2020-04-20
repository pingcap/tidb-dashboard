import React from 'react'
import { Tooltip, Typography } from 'antd'
import type { TooltipPlacement } from 'antd/es/tooltip'
import { InfoCircleOutlined, WarningOutlined } from '@ant-design/icons'

export interface ITextWithInfoProps {
  tooltip: React.ReactNode
  placement?: TooltipPlacement
  children: React.ReactNode
  type?: 'warning' | 'danger'
}

export default function TextWithInfo({
  tooltip,
  placement,
  children,
  type,
}: ITextWithInfoProps) {
  const Icon = type ? WarningOutlined : InfoCircleOutlined
  const textInner = (
    <>
      {children}
      <Icon style={{ marginLeft: 8 }} />
    </>
  )
  return (
    <Tooltip title={tooltip} placement={placement}>
      <span>
        {type ? (
          <Typography.Text type={type}>{textInner}</Typography.Text>
        ) : (
          textInner
        )}
      </span>
    </Tooltip>
  )
}
