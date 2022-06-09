import React, { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'

export default function ParamsPageWrapper({
  children
}: {
  children: ReactNode
}) {
  const { search } = useLocation()
  if (React.isValidElement(children)) {
    return React.cloneElement(children, { key: search })
  }
  return null
}
