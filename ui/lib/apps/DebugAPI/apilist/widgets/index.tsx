import React from 'react'
import type { FormInstance } from 'antd/es/form/Form'

import { DebugapiEndpointAPIModel, DebugapiEndpointAPIParam } from '@lib/client'
import type { Topology } from '../ApiForm'
import { TextWidget } from './Text'
import { HostSelectWidget } from './Host'
import { DatabaseWidget } from './Database'
import { TableWidget } from './Table'

export interface Widgets {
  [type: string]: ApiFormWidget
}

export interface ApiFormWidget {
  (config: ApiFormWidgetConfig): JSX.Element
}

export interface ApiFormWidgetConfig {
  form: FormInstance
  param: DebugapiEndpointAPIParam
  endpoint: DebugapiEndpointAPIModel
  topology: Topology
  value?: string
  onChange?: (v: string) => void
}

// For customized form controls. https://ant.design/components/form-cn/#components-form-demo-customized-form-controls
const createJSXElementWrapper = (WidgetDef: ApiFormWidget) => (
  config: ApiFormWidgetConfig
) => <WidgetDef {...config} />

export const paramModelWidgets: Widgets = {
  host: HostSelectWidget,
  text: TextWidget,
  db: createJSXElementWrapper(DatabaseWidget),
  table: createJSXElementWrapper(TableWidget),
}

export const paramWidgets: Widgets = {}
