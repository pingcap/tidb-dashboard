import { initPrefs } from '@msrvida/sanddance-explorer/dist/es6/partialInsight'
import { RecommenderSummary } from '@msrvida/chart-recommender'
import { SideTabId } from '@msrvida/sanddance-explorer/dist/es6/interfaces'
import { DataScopeId } from '@msrvida/sanddance-explorer/dist/es6/controls/dataScope'
import {
  ensureColumnsExist,
  ensureColumnsPopulated,
} from '@msrvida/sanddance-explorer/dist/es6/columns'
import { strings } from '@msrvida/sanddance-explorer/dist/es6/language'
import { loadDataArray } from '@msrvida/sanddance-explorer/dist/es6/dataLoader'
import { Explorer_Class } from '@msrvida/sanddance-explorer'
import { SandDance } from '@msrvida/sanddance-react'
import { DataSource } from '@dataViz/types'
import { getAuthTokenAsBearer } from '@lib/utils/auth'

// originally from  @msrvida/sanddance-explorer/dist/es6/dataLoader.js
const loadDataFile = (dataFile: DataSource) =>
  new Promise((resolve, reject) => {
    const vega = SandDance.VegaDeckGl.base.vega
    const loader = vega.loader()

    function handleRawText(text) {
      let data
      try {
        data = vega.read(text, { type: dataFile.type, parse: {} })
      } catch (e) {
        reject(e)
      }
      if (data) {
        loadDataArray(data, dataFile.type)
          .then((dc) => {
            if (dataFile.snapshotsUrl) {
              fetch(dataFile.snapshotsUrl)
                .then((response) => response.json())
                .then((snapshots) => {
                  dc.snapshots = snapshots
                  resolve(dc)
                })
                .catch(reject)
            } else if (dataFile.snapshots) {
              dc.snapshots = dataFile.snapshots
              resolve(dc)
            } else {
              resolve(dc)
            }
          })
          .catch(reject)
      }
    }

    // ADD LOGIC FOR AUTH TOKEN
    if (dataFile.dataUrl) {
      loader
        .load(
          dataFile.dataUrl,
          dataFile.withToken
            ? {
                headers: { Authorization: getAuthTokenAsBearer() || '' },
              }
            : {}
        )
        .then(handleRawText)
        .catch(reject)
    } else if (dataFile.rawText) {
      handleRawText(dataFile.rawText)
    } else {
      reject(
        'dataFile object must have either dataUrl or rawText property set.'
      )
    }
  })

export function overrideExplorerMethods(explorer: Explorer_Class) {
  // originally from  @msrvida/sanddance-explorer/dist/es6/explorer.js
  explorer.load = function (data, getPartialInsight, optionsOrPrefs) {
    this.setState({ historyIndex: -1, historyItems: [] })
    this.changeInsight(
      { columns: null } as any,
      { label: null, omit: true } as any,
      { note: null } as any
    )
    return new Promise((resolve, reject) => {
      const loadFinal = (dataContent) => {
        let partialInsight
        this.prefs =
          (optionsOrPrefs && (optionsOrPrefs.chartPrefs || optionsOrPrefs)) ||
          {}
        if (getPartialInsight) {
          partialInsight = getPartialInsight(dataContent.columns)
          initPrefs(this.prefs, partialInsight)
        }
        if (!partialInsight) {
          let r = new RecommenderSummary(dataContent.columns, dataContent.data)
          partialInsight = r.recommend()
        }
        partialInsight = Object.assign(
          {
            facetStyle: 'wrap',
            filter: null,
            totalStyle: null,
            transform: null,
          },
          partialInsight
        )
        if (partialInsight.chart === 'barchart') {
          partialInsight.chart = 'barchartV'
        }
        const selectedItemIndex = Object.assign(
          {},
          this.state.selectedItemIndex
        )
        const sideTabId = SideTabId.ChartType
        selectedItemIndex[DataScopeId.AllData] = 0
        selectedItemIndex[DataScopeId.FilteredData] = 0
        selectedItemIndex[DataScopeId.SelectedData] = 0
        let newState = Object.assign(
          {
            dataFile,
            dataContent,
            snapshots: dataContent.snapshots || this.state.snapshots,
            autoCompleteDistinctValues: {},
            filteredData: null,
            tooltipExclusions:
              (optionsOrPrefs && optionsOrPrefs.tooltipExclusions) || [],
            selectedItemIndex,
            sideTabId,
          },
          partialInsight
        )
        this.getColorContext = null
        ensureColumnsExist(
          newState.columns,
          dataContent.columns,
          newState.transform
        )
        newState.errors = ensureColumnsPopulated(
          partialInsight ? partialInsight.chart : null,
          newState.columns,
          dataContent.columns
        )
        this.changeInsight(
          partialInsight,
          { label: strings.labelHistoryInit, insert: true },
          newState
        )
        this.activateDataBrowserItem(sideTabId, this.state.dataScopeId)
        resolve()
      }
      let dataFile
      if (Array.isArray(data)) {
        return loadDataArray(data, 'json')
          .then((result) => {
            dataFile = {
              type: 'json',
            }
            loadFinal(result)
          })
          .catch(reject)
      } else {
        dataFile = data
        return loadDataFile(dataFile).then(loadFinal).catch(reject)
      }
    })
  }
}
