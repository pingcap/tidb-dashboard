import React, { useCallback, useState } from 'react'
import { Pre } from '@lib/components'

import InstanceSelectV2 from '.'
import { TopoCompInfoWithSignature } from '@lib/client'
import { Button } from 'antd'

export default {
  title: 'Select/Instance Select V2',
}

const instanceLists: Array<Array<TopoCompInfoWithSignature>> = [
  [
    {
      ip: 'sig1',
      port: 2379,
      status_port: 0,
      kind: 'pd',
      signature: 'sig1',
      version: 'v5.3.0',
      status: 'up',
    },
    {
      ip: 'sig2',
      port: 4001,
      status_port: 10081,
      kind: 'tidb',
      signature: 'sig2',
      version: 'v5.3.0',
      status: 'up',
    },
    {
      ip: 'sig3',
      port: 20160,
      status_port: 20180,
      kind: 'tikv',
      signature: 'sig3',
      version: 'v5.3.0',
      status: 'up',
    },
    {
      ip: 'sig4',
      port: 4000,
      status_port: 10080,
      kind: 'tidb',
      signature: 'sig4',
      version: 'v5.3.0',
      status: 'down',
    },
  ],
  [],
  [
    {
      ip: 'sig1',
      port: 2379,
      status_port: 0,
      kind: 'pd',
      signature: 'sig1',
      version: 'v5.3.0',
      status: 'up',
    },
    {
      ip: 'sig2',
      port: 4001,
      status_port: 10081,
      kind: 'tidb',
      signature: 'sig2',
      version: 'v5.3.0',
      status: 'up',
    },
    {
      ip: 'sig5',
      port: 2379,
      status_port: 0,
      kind: 'pd',
      signature: 'sig5',
      version: 'v5.3.0',
      status: 'up',
    },
    {
      ip: 'sig6',
      port: 4001,
      status_port: 10081,
      kind: 'tidb',
      signature: 'sig6',
      version: 'v5.3.0',
      status: 'up',
    },
  ],
]

export const Example = () => {
  const [listIdx, setListIdx] = useState(0)
  const handleButtonClick = useCallback(() => {
    setListIdx((idx) => (idx + 1) % instanceLists.length)
  }, [])
  const [instanceSelectValue, setInstanceSelectValue] = useState<string[]>([])

  return (
    <>
      <div style={{ marginBottom: 12 }}>
        <Pre>Instance select value = {JSON.stringify(instanceSelectValue)}</Pre>
      </div>
      <div>
        <InstanceSelectV2
          placeholder="Uncontrolled Value"
          instances={instanceLists[listIdx]}
        />
        <InstanceSelectV2
          instances={instanceLists[listIdx]}
          value={instanceSelectValue}
          onChange={setInstanceSelectValue}
        />
        <Button onClick={handleButtonClick}>Update Instances</Button>
      </div>
    </>
  )
}
