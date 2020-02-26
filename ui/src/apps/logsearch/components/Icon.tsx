import { Icon } from 'antd'
import React from 'react'

export function LoadingIcon() {
  return <Icon type="loading" />
}

export function SuccessIcon() {
  return (
    <Icon type="check-circle" theme="twoTone" twoToneColor="#52c41a" />
  )
}

export function FailIcon() {
  return (
    <Icon type="info-circle" theme="twoTone" twoToneColor="#faad14" />
  )
}