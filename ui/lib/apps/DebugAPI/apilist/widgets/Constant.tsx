import React from 'react'

import type { ApiFormWidget, QueryBuilder, ParamModelType } from './index'

export const ConstantWidget: ApiFormWidget = ({ param }) => {
  return <p>{(param.model as ParamModelType).data}</p>
}

export const ConstantQueryBuilder: QueryBuilder = (p) => {
  return `${p.name}=${(p.model as ParamModelType).data}`
}
