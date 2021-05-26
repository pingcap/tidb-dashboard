import React from 'react'

import type { ApiFormWidget, QueryBuilder } from './index'

export const ConstantWidget: ApiFormWidget = ({ param }) => {
  return <p>{param.model?.data}</p>
}

export const ConstantQueryBuilder: QueryBuilder = (p) => {
  return `${p.name}=${p.model?.data}`
}
