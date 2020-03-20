import React from 'react'
import ReactDOM from 'react-dom'
import singleSpaReact from 'single-spa-react'
import { KeyVis as RootComponent } from '@pingcap-incubator/keyvis'

const reactLifecycles = singleSpaReact({
  React,
  ReactDOM,
  rootComponent: RootComponent,
  domElementGetter,
})

export const bootstrap = [reactLifecycles.bootstrap]
export const mount = [reactLifecycles.mount]
export const unmount = [reactLifecycles.unmount]

function domElementGetter() {
  return document.getElementById('__spa_content__')
}
