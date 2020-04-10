import React from 'react'
import HostTable from '../components/HostTable'
import InstanceTable from '../components/InstanceTable'

export default function ListPage() {
  return (
    <>
      <InstanceTable />
      <HostTable />
    </>
  )
}
