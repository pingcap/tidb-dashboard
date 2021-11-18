import { EndpointAPIParam } from '@lib/client'
import React, { useEffect } from 'react'

import type { ApiFormWidget, QueryBuilder, ParamModelType } from './index'

export const ConstantWidget: ApiFormWidget = ({ param, onChange }) => {
  const model = param.model as ParamModelType
  useEffect(() => {
    onChange!(model.data)
  })
  return <p>{model.data}</p>
}

export const ConstantQueryBuilder: QueryBuilder = (p) => {
  return `${p.name}=${(p.model as ParamModelType).data}`
}

export const isConstantModel = (p: EndpointAPIParam): boolean => {
  return (p.model as ParamModelType).type === 'constant'
}
