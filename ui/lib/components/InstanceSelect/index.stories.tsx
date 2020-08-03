import React, { useState, useRef } from 'react'
import { Pre } from '@lib/components'

import InstanceSelect, { IInstanceSelectRefProps } from '.'

export default {
  title: 'Select/Instance Select',
}

const InstanceSelectRegion = () => {
  const [instanceSelectValue, setInstanceSelectValue] = useState<string[]>([])
  const s = useRef<IInstanceSelectRefProps>(null)

  return (
    <>
      <InstanceSelect
        value={instanceSelectValue}
        onChange={setInstanceSelectValue}
        defaultSelectAll
        ref={s}
      />
      <div style={{ marginTop: 12 }}>
        <Pre>Instance select value = {JSON.stringify(instanceSelectValue)}</Pre>
        <Pre>
          Instance select value instances ={' '}
          {JSON.stringify(
            s.current && s.current.getInstanceByKeys(instanceSelectValue)
          )}
        </Pre>
      </div>
    </>
  )
}

export const uncontrolled = () => (
  <InstanceSelect placeholder="Uncontrolled Value" />
)

export const controlled = () => <InstanceSelectRegion />
