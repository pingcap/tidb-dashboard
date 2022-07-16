import {
  CheckCircleTwoTone,
  InfoCircleTwoTone,
  LoadingOutlined
} from '@ant-design/icons'
import React from 'react'

export function LoadingIcon() {
  return <LoadingOutlined />
}

export function SuccessIcon() {
  return <CheckCircleTwoTone twoToneColor="#52c41a" />
}

export function FailIcon() {
  return <InfoCircleTwoTone twoToneColor="#faad14" />
}
