import React from 'react'
import { Welcome } from '../components'
import { sayHello } from '../utils'

export default function () {
  return <Welcome title={sayHello()} />
}
