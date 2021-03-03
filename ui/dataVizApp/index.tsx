// Modified from github.com/microsoft/SandDance under the MIT license.
import { use } from './base'
import { fluentUI } from './fluentUIComponents'
import { SandDanceApp } from './SandDanceApp'
import * as deck from '@deck.gl/core'
import * as layers from '@deck.gl/layers'
import * as luma from '@luma.gl/core'
import React from 'react'
import ReactDOM from 'react-dom'
import * as vega from 'vega'
import './index.less'
import {
  defaultDataSources,
  insightPresets,
  optionPresets,
  defaultColumnsTransformers,
} from './presets'
import './overrides'

use(fluentUI, vega, deck, layers, luma)

ReactDOM.render(
  <SandDanceApp
    themeColors={{}}
    columnsTransformers={defaultColumnsTransformers}
    insights={insightPresets}
    initialOptions={optionPresets}
    dataSources={defaultDataSources}
  />,
  document.getElementById('app')
)
