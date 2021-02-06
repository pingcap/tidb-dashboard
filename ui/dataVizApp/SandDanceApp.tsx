// Modified from github.com/microsoft/SandDance under the MIT license.
import { base } from './base'
import {
  DataSourceButton,
  DataSourcePicker,
  Props as DataSourceProps,
} from './DataSourcePicker'
import { downloadData } from './download'
import { strings } from './language'
import {
  downloadSnapshotsJSON,
  serializeSnapshot,
  SnapshotExport,
  SnapshotImportLocal,
  SnapshotImportRemote,
  validSnapshots,
} from './snapshots'
import {
  ColumnsTransformers,
  DataSource,
  DataSourceSnapshot,
  InsightMap,
} from './types'
import { FluentUITypes } from '@msrvida/fluentui-react-cdn-typings'
import {
  ColorSettings,
  Explorer,
  Explorer_Class,
  getColorSettingsFromThemePalette,
  Options,
  SandDance,
  SideTabId,
  themePalettes,
  ViewerOptions,
} from '@msrvida/sanddance-explorer'
import React from 'react'
import { overrideExplorerMethods } from '@dataViz/overrides'
import {
  copyToClipboard,
  getLocalStorageManager,
  LocalStorageManager,
} from '@dataViz/utils'
import { IconButton } from 'office-ui-fabric-react/lib/Button'

const VegaDeckGl = SandDance.VegaDeckGl

export interface Props {
  themeColors: { [theme: string]: ColorSettings }
  dataSources: DataSource[]
  columnsTransformers?: ColumnsTransformers
  insights?: InsightMap
  initialOptions?: { [dataSetId: string]: Options }
}

export type Dialogs = 'import-local' | 'import-remote' | 'export'

export interface State {
  compactUI: boolean
  darkTheme: boolean
  dialogMode: Dialogs | null
  dataSource: DataSource
}

function getThemePalette(darkTheme: boolean) {
  return themePalettes[darkTheme ? 'dark-theme' : '']
}

function getViewerOptions(
  darkTheme: boolean,
  themeColors: { [theme: string]: ColorSettings }
) {
  const colors = themeColors && themeColors[darkTheme ? 'dark' : 'light']
  const viewerOptions: Partial<ViewerOptions> = {
    colors: {
      ...getColorSettingsFromThemePalette(getThemePalette(darkTheme)),
      ...colors,
    },
  }
  return viewerOptions
}

function getSnapshotFromHash(): DataSourceSnapshot | undefined {
  const hash = document.location.hash && document.location.hash.substring(1)
  if (hash) {
    try {
      return JSON.parse(decodeURIComponent(hash)) as DataSourceSnapshot
    } catch (e) {}
  }
  return undefined
}

function getDefaultDataSource(dataSources: DataSource[]): DataSource {
  const defaultID = new URLSearchParams(window.location.search).get('default')
  const snapshotOnLoad = getSnapshotFromHash()
  return (
    (defaultID && defaultID === snapshotOnLoad?.dataSource?.id
      ? snapshotOnLoad.dataSource
      : dataSources.find((d) => d.id === defaultID)) ||
    snapshotOnLoad?.dataSource ||
    dataSources[0]
  )
}

interface Handlers {
  hashchange: (e?: HashChangeEvent) => void
  resize: (e?: UIEvent) => void
}

const SANDDANCE_APP_PREF_KEY = 'data-viz-app-pref'

interface SandDanceAppPref {
  compactUI: boolean
  darkTheme: boolean
}

export class SandDanceApp extends React.Component<Props, State> {
  // @ts-ignore
  private explorer: Explorer_Class
  private viewerOptions: Partial<SandDance.types.ViewerOptions>
  private readonly handlers: Handlers
  private readonly columnsTransformers?: ColumnsTransformers
  private dataSourcePicker?: DataSourcePicker
  private postLoad?: (dataSource: DataSource) => void

  private preferManager: LocalStorageManager<SandDanceAppPref>

  constructor(props: Props) {
    super(props)

    this.preferManager = getLocalStorageManager(SANDDANCE_APP_PREF_KEY)
    const initPref = this.preferManager.get()

    this.state = {
      compactUI: initPref?.compactUI || false,
      darkTheme: initPref?.darkTheme || false,
      dataSource: getDefaultDataSource(props.dataSources),
      dialogMode: null,
    }
    this.viewerOptions = getViewerOptions(
      this.state.darkTheme,
      props.themeColors
    )
    this.handlers = {
      hashchange: () => {
        const snapshot = getSnapshotFromHash()
        if (snapshot) {
          this.explorer?.calculate(() => this.hydrateSnapshot(snapshot))
        }
      },
      resize: () => {
        this.explorer?.resize()
      },
    }
    this.columnsTransformers = props.columnsTransformers
    this.wireEventHandlers(true)
    this.changeColorScheme(this.state.darkTheme)
  }

  async load(
    dataSource: DataSource,
    partialInsight?: Partial<SandDance.specs.Insight>
  ) {
    //clone so that we do not modify original object
    dataSource = VegaDeckGl.util.clone(dataSource)
    this.setState({ dataSource })
    document.title = `${dataSource.displayName} - DataViz`
    return this.explorer.load(
      dataSource,
      // @ts-ignore
      (columns) => {
        this.columnsTransformers?.[dataSource.id]?.(columns)
        return (
          partialInsight ||
          (this.props.insights && this.props.insights[dataSource.id])
        )
      },
      this.props.initialOptions &&
        VegaDeckGl.util.deepMerge(
          {},
          this.props.initialOptions['*'],
          this.props.initialOptions[dataSource.id]
        )
    )
  }

  updateExplorerViewerOptions(
    viewerOptions: Partial<SandDance.types.ViewerOptions>
  ) {
    this.viewerOptions = viewerOptions
    this.explorer?.updateViewerOptions(this.viewerOptions)
  }

  changeColorScheme(darkTheme: boolean) {
    this.updateExplorerViewerOptions(
      getViewerOptions(darkTheme, this.props.themeColors)
    )
    VegaDeckGl.base.vega.scheme(
      SandDance.constants.ColorScaleNone,
      (x) => this.explorer.viewer.options.colors.defaultCube
    )
    this.explorer?.viewer?.renderSameLayout(this.viewerOptions)
    base.fluentUI.loadTheme({ palette: getThemePalette(darkTheme) })
  }

  mounted = (explorer: Explorer_Class) => {
    this.explorer = explorer
    overrideExplorerMethods(this.explorer)

    this.load(this.state.dataSource, getSnapshotFromHash()?.insight).catch(
      (e) => {
        this.loadError(this.state.dataSource, e)
      }
    )

    document.onkeyup = (e) => {
      if (e.ctrlKey && (e.key === 'z' || e.key === 'Z')) {
        if (e.shiftKey) {
          this.explorer.redo()
        } else {
          this.explorer.undo()
        }
      }
    }
  }

  render() {
    const theme = this.state.darkTheme ? 'dark-theme' : ''
    const dataSourceProps: DataSourceProps = {
      dataSource: this.state.dataSource,
      dataSources: this.props.dataSources,
      changeDataSource: (dataSource: DataSource) => {
        document.location.hash = ''
        return this.load(dataSource)
          .then(() => {
            if (this.postLoad) {
              this.postLoad(dataSource)
              this.postLoad = undefined
            }
          })
          .catch((e) => this.loadError(dataSource, e))
      },
    }
    return (
      <section className="sanddance-app">
        <Explorer
          logoClickTarget="_self"
          theme={theme}
          snapshotProps={{
            // @ts-ignore
            modifySnapShot: (snapshot: DataSourceSnapshot) => {
              snapshot.dataSource = this.state.dataSource
            },
            getTopActions: (snapshots) => {
              const items: FluentUITypes.IContextualMenuItem[] = [
                {
                  key: 'import',
                  text: strings.menuSnapshotsImport,
                  subMenuProps: {
                    items: [
                      {
                        key: 'import-local',
                        text: strings.menuLocal,
                        onClick: () =>
                          this.setState({ dialogMode: 'import-local' }),
                      },
                      {
                        key: 'import-remote',
                        text: strings.menuUrl,
                        onClick: () =>
                          this.setState({ dialogMode: 'import-remote' }),
                      },
                    ],
                  },
                },
                {
                  key: 'export',
                  text: strings.menuSnapshotsExportAsJSON,
                  disabled: snapshots.length === 0,
                  onClick: () =>
                    downloadSnapshotsJSON(
                      snapshots,
                      `${this.state.dataSource.displayName}.snapshots`
                    ),
                },
                {
                  key: 'export-as',
                  text: strings.menuSnapshotsExportAs,
                  disabled: snapshots.length === 0,
                  onClick: () => this.setState({ dialogMode: 'export' }),
                },
              ]
              return items
            },
            getChildren: (snapshots) => (
              <div>
                {this.state.dialogMode === 'import-local' && (
                  <SnapshotImportLocal
                    theme={theme}
                    dataSource={this.state.dataSource}
                    onImportSnapshot={(snapshots) =>
                      this.explorer.setState({ snapshots })
                    }
                    onDismiss={() => this.setState({ dialogMode: null })}
                  />
                )}
                {this.state.dialogMode === 'import-remote' && (
                  <SnapshotImportRemote
                    theme={theme}
                    dataSource={this.state.dataSource}
                    onImportSnapshot={(snapshots) =>
                      this.explorer.setState({ snapshots })
                    }
                    onSnapshotsUrl={(snapshotsUrl) => {
                      const dataSource = { ...this.state.dataSource }
                      dataSource.snapshotsUrl = snapshotsUrl
                      this.setState({ dataSource })
                    }}
                    onDismiss={() => this.setState({ dialogMode: null })}
                  />
                )}
                {this.state.dialogMode === 'export' && (
                  <SnapshotExport
                    explorer={this.explorer}
                    dataSource={this.state.dataSource}
                    snapshots={snapshots}
                    onDismiss={() => this.setState({ dialogMode: null })}
                    theme={theme}
                  />
                )}
              </div>
            ),
            // @ts-ignore
            getActions: (snapshot: DataSourceSnapshot, i) => {
              let element: JSX.Element
              if (snapshot.dataSource?.dataSourceType === 'local') {
                element = <span key={`link${i}`} />
              } else {
                const url =
                  window.location.href.split('#')[0] +
                  '#' +
                  serializeSnapshot(snapshot)
                element = (
                  <IconButton
                    key={`link${i}`}
                    title={strings.labelLinkDescription}
                    ariaLabel={strings.labelLinkDescription}
                    iconProps={{
                      iconName: 'Link',
                    }}
                    onClick={() => {
                      if (copyToClipboard(url)) {
                        alert(strings.msgCopyLinkSuccess)
                      } else {
                        prompt(strings.msgCopyLinkFail, url)
                      }
                    }}
                  />
                )
              }
              return [{ element }]
            },
            getTitle: (insight) =>
              `${this.state.dataSource.displayName} ${insight.chart}`,
            getDescription: (insight) => '',
          }}
          // @ts-ignore
          onSnapshotClick={(
            snapshot: DataSourceSnapshot,
            selectedSnapshotIndex
          ) => this.hydrateSnapshot(snapshot, selectedSnapshotIndex)}
          initialView="2d"
          mounted={this.mounted}
          dataExportHandler={(data, datatype, displayName) => {
            try {
              downloadData(data, `${displayName}.${datatype}`)
            } catch (e) {
              this.explorer.setState({ errors: [strings.errorDownloadFailure] })
            }
          }}
          datasetElement={
            <DataSourceButton
              getPicker={() => this.dataSourcePicker!}
              {...dataSourceProps}
            />
          }
          topBarButtonProps={[
            {
              key: 'theme',
              text: this.state.darkTheme
                ? strings.buttonThemeLight
                : strings.buttonThemeDark,
              iconProps: {
                iconName: this.state.darkTheme ? 'Sunny' : 'ClearNight',
              },
              onClick: () => {
                const darkTheme = !this.state.darkTheme
                this.preferManager.set({
                  compactUI: this.state.compactUI,
                  darkTheme: darkTheme,
                })
                this.setState({ darkTheme })
                this.changeColorScheme(darkTheme)
              },
            },
          ]}
          viewerOptions={this.viewerOptions}
          compactUI={this.state.compactUI}
          additionalSettings={[
            {
              groupLabel: strings.labelPreferences,
              children: (
                <base.fluentUI.Toggle
                  label={strings.labelCompactUI}
                  title={strings.labelCompactUIDescription}
                  checked={this.state.compactUI}
                  onChange={(e, checked) => {
                    if (checked === undefined) return
                    this.preferManager.set({
                      compactUI: checked,
                      darkTheme: this.state.darkTheme,
                    })
                    this.setState({ compactUI: checked })
                  }}
                />
              ),
            },
          ]}
        />
        <DataSourcePicker
          ref={(dsp) => {
            if (dsp && !this.dataSourcePicker) this.dataSourcePicker = dsp
          }}
          theme={theme}
          {...dataSourceProps}
        />
      </section>
    )
  }

  private wireEventHandlers(add: boolean) {
    for (const key in this.handlers) {
      if (add) {
        window.addEventListener(key, this.handlers[key])
      } else {
        window.removeEventListener(key, this.handlers[key])
      }
    }
  }

  private isSameDataSource(a: DataSource, b: DataSource) {
    if (
      a.dataSourceType === b.dataSourceType &&
      a.type === b.type &&
      a.id === b.id
    ) {
      if (a.dataSourceType === 'url') {
        return a.dataUrl === b.dataUrl
      }
      return true
    }
    return false
  }

  private hydrateSnapshot(
    snapshot: DataSourceSnapshot,
    selectedSnapshotIndex = -1
  ) {
    if (snapshot.dataSource) {
      if (this.isSameDataSource(snapshot.dataSource, this.state.dataSource)) {
        if (selectedSnapshotIndex === -1) {
          this.explorer.reviveSnapshot(snapshot)
        } else {
          this.explorer.reviveSnapshot(selectedSnapshotIndex)
        }
        if (
          snapshot.dataSource.snapshotsUrl &&
          snapshot.dataSource.snapshotsUrl !==
            this.state.dataSource.snapshotsUrl
        ) {
          //load new snapshots url
          fetch(snapshot.dataSource.snapshotsUrl)
            .then((response) => response.json())
            .then((snapshots) => {
              if (validSnapshots(snapshots)) {
                this.explorer.setState({ snapshots })
                const dataSource = { ...this.state.dataSource }
                dataSource.snapshotsUrl = snapshot.dataSource.snapshotsUrl
                this.setState({ dataSource })
              }
            })
        }
      } else {
        if (snapshot.dataSource.dataSourceType === 'local') {
          this.dataSourcePicker!.setState({ dialogMode: 'local' })
          this.postLoad = (ds) => {
            if (this.isSameDataSource(snapshot.dataSource, ds)) {
              this.hydrateSnapshot(snapshot, selectedSnapshotIndex)
            }
          }
        } else {
          this.load(snapshot.dataSource, snapshot.insight)
            .then(() => {
              this.explorer.setState({
                sideTabId: SideTabId.Snapshots,
                note: snapshot.description!,
              })
              this.explorer.scrollSnapshotIntoView(selectedSnapshotIndex)
            })
            .catch((e) => {
              this.loadError(snapshot.dataSource, e)
            })
        }
      }
      return true
    }
  }

  private loadError(dataSource: DataSource, e: Error) {
    let error = formatLoadError(dataSource, e)
    this.explorer.setState({ errors: Array.isArray(error) ? error : [error] })
    this.setState({
      // @ts-ignore
      dataSource: { dataSourceType: null, id: null, type: null },
    })
  }
}

function formatLoadError(dataSource: DataSource, e: Error): string | string[] {
  switch (dataSource.dataSourceType) {
    case 'local':
      return strings.errorDataSourceFromLocal(dataSource, e)
    case 'dashboard':
      return strings.errorDataSourceFromDashboard(dataSource, e)
    case 'url':
      return strings.errorDataSourceFromUrl(dataSource, e)
  }
}
