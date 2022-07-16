import React from 'react'
import { Input } from 'antd'

import type { ApiFormWidget } from './index'

export const TextWidget: ApiFormWidget = ({ param }) => {
  const placeholder = ((param.ui_props as any)?.placeholder as string) ?? ''
  return <Input placeholder={placeholder} />
}
