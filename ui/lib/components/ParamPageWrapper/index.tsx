import React, { ReactNode } from 'react'
import { useParams } from 'react-router-dom'

export interface IParamPageWrapperProps {
  paramName?: string
  children: ReactNode
}

export default function ParamPageWrapper({
  paramName = 'id',
  children,
}: IParamPageWrapperProps) {
  const paramValue = useParams()[paramName]
  if (React.isValidElement(children) && paramValue) {
    return React.cloneElement(children, { key: paramValue })
  }
  return null
}
