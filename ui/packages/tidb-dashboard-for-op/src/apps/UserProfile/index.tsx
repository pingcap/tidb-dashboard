import React from 'react'
import {
  UserProfileApp,
  UserProfileProvider
} from '@pingcap/tidb-dashboard-lib'
import { ctx } from './context'

export default function () {
  return (
    <UserProfileProvider value={ctx}>
      <UserProfileApp />
    </UserProfileProvider>
  )
}
