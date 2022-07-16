import React from 'react'
import { Tooltip, Typography } from 'antd'
import type { TooltipPlacement } from 'antd/es/tooltip'
import { InfoCircleOutlined, WarningOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'

export interface ITextWithInfoProps {
  tooltip?: React.ReactNode
  placement?: TooltipPlacement
  children: React.ReactNode
  type?: 'warning' | 'danger'
}

function TextWithInfo({
  tooltip,
  placement,
  children,
  type
}: ITextWithInfoProps) {
  let textWithIcon
  if (tooltip) {
    const Icon = type ? WarningOutlined : InfoCircleOutlined
    textWithIcon = (
      <span>
        {children} <Icon />
      </span>
    )
  } else {
    textWithIcon = children
  }

  let textWithColor
  if (type) {
    textWithColor = (
      <Typography.Text type={type}>{textWithIcon}</Typography.Text>
    )
  } else {
    textWithColor = textWithIcon
  }

  if (!tooltip) {
    return textWithColor
  }

  return (
    <Tooltip title={tooltip} placement={placement}>
      {textWithColor}
    </Tooltip>
  )
}

export interface ITransKeyTextWithInfo {
  transKey: string
  placement?: TooltipPlacement
  type?: 'warning' | 'danger'
}

function TransKey({ transKey, placement, type }: ITransKeyTextWithInfo) {
  const { t } = useTranslation()
  const text = t(transKey)
  const tooltip = t(`${transKey}_tooltip`, {
    defaultValue: '',
    fallbackLng: '_'
  })
  return (
    <TextWithInfo tooltip={tooltip} placement={placement} type={type}>
      {text}
    </TextWithInfo>
  )
}

TextWithInfo.TransKey = TransKey

export default TextWithInfo
