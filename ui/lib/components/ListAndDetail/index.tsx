import { useLocation } from 'react-router-dom'
import React from 'react'

export interface ListAndDetailProps {
  ListComponent: React.FunctionComponent
  DetailComponent: React.FunctionComponent<{ style: React.CSSProperties }>
  detailPathMatcher: (path: string) => boolean
}

export default function ({
  ListComponent,
  DetailComponent,
  detailPathMatcher,
}: ListAndDetailProps) {
  const location = useLocation()
  console.log('rendered')
  return (
    <div
      style={{
        position: 'relative',
      }}
    >
      <ListComponent />
      {detailPathMatcher(location.pathname) && (
        <DetailComponent
          style={{
            zIndex: 99,
            position: 'absolute',
            top: 0,
            left: 0,
            background: '#fff',
            width: '100%',
            transition: 'none',
          }}
        />
      )}
    </div>
  )
}
