import React from 'react'
import {
  SlowQueryV2App,
  SlowQueryV2Provider
} from '@pingcap/tidb-dashboard-lib'
import { ctx } from './context'

export default function () {
  return (
    <SlowQueryV2Provider value={ctx}>
      <SlowQueryV2App />
    </SlowQueryV2Provider>
  )
}
