// Modified from github.com/microsoft/SandDance under the MIT license.
import { FluentUIComponents } from '@msrvida/fluentui-react-cdn-typings'
import * as SandDanceExplorer from '@msrvida/sanddance-explorer'
import { SandDance } from '@msrvida/sanddance-explorer'
import * as React from 'react'
import * as ReactDOM from 'react-dom'

/**
 * References to dependency libraries.
 */
export interface Base {
  fluentUI: FluentUIComponents
}

export let base: Base = {
  // @ts-ignore
  fluentUI: null,
}

/**
 * Specify the dependency libraries to use for rendering.
 * @param fluentUI FluentUI React library.
 * @param vega Vega library.
 * @param deck @deck.gl/core library.
 * @param layers @deck.gl/layers library.
 * @param luma @luma.gl/core library.
 */
export function use(
  fluentUI: FluentUIComponents,
  vega: SandDance.VegaDeckGl.types.VegaBase,
  deck: SandDance.VegaDeckGl.types.DeckBase,
  layers: SandDance.VegaDeckGl.types.DeckLayerBase,
  luma: SandDance.VegaDeckGl.types.LumaBase
) {
  SandDanceExplorer.use(fluentUI, React, ReactDOM, vega, deck, layers, luma)
  // base = {
  //   fluentUI,
  // }
  base.fluentUI = fluentUI
}
