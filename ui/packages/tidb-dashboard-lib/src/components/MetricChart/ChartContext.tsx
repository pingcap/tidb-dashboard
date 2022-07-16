import React from 'react'
import { PointerEvent } from '@elastic/charts'
import { EventEmitter } from 'ahooks/lib/useEventEmitter'

export const ChartContext = React.createContext<EventEmitter<PointerEvent>>(
  null as any
)
