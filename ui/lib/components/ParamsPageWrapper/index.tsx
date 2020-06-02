import React, { ReactNode } from 'react'
import { useParams } from 'react-router-dom'

export default function ParamsPageWrapper({
  children,
}: {
  children: ReactNode
}) {
  const params = useParams()
  if (React.isValidElement(children)) {
    return React.cloneElement(children, { key: JSON.stringify(params) })
  }
  return null
}
